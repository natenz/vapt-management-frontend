import { describe, expect, it } from "vitest";
import type { ProjectReport } from "@/entities/finding";
import type { Project } from "@/entities/project";
import type { User } from "@/entities/user";
import {
  capacity,
  catalogStats,
  findingTotals,
  hasFindingsStage,
  monthlyTrend,
  projectKpis,
  recentActivity,
  recentlyUpdated,
  riskiestProjects,
  roleComposition,
  stageFunnel,
  upcomingDeadlines,
} from "./superadmin-metrics";

const TODAY = new Date(2026, 10, 19); // 19 Nov 2026

const proj = (
  id: number,
  status: string,
  start: string | null,
  end: string | null,
  updated?: string,
): Project => ({
  project_id: id,
  project_name: `Proyek ${id}`,
  client_name: "Klien",
  total_mandays: 0,
  projected_mandays: 0,
  pm_id: 1,
  start_date: start,
  end_date: end,
  status: { status_process_id: id, status_name: status },
  updated_at: updated,
});

const finding = (severity: string, status: string) =>
  ({ severity, status }) as ProjectReport["findings"][number];

const report = (p: Project, findings: ProjectReport["findings"]): ProjectReport =>
  ({ project: p, findings }) as ProjectReport;

const user = (id: number, role: string): User => ({
  sys_user_id: id,
  username: `u${id}`,
  email: `u${id}@t`,
  role_id: 1,
  role: { role_id: 1, role_name: role },
});

describe("proyek & siklus", () => {
  const projects = [
    proj(1, "Assessment", "2026-11-01", "2026-11-10"), // terlambat 9 hari
    proj(2, "Remediasi", "2026-10-01", "2026-11-21"), // 2 hari lagi
    proj(3, "Scoping", "2026-12-01", "2026-12-30"),
    proj(4, "Done", "2026-08-01", "2026-09-15"),
  ];

  it("menghitung KPI aktif, selesai, terlambat, dan tenggat ≤ 3 hari", () => {
    expect(projectKpis(projects, TODAY)).toEqual({ total: 4, active: 3, done: 1, overdue: 1, dueSoon: 1 });
  });

  it("mengurutkan tenggat terdekat, terlambat lebih dulu, tanpa proyek Done", () => {
    const rows = upcomingDeadlines(projects, 6, TODAY);
    expect(rows.map((r) => [r.project.project_id, r.days])).toEqual([
      [1, -9],
      [2, 2],
      [3, 41],
    ]);
  });

  it("funnel memakai urutan 10 tahap (tanpa Planning) dan menghitung tiap status", () => {
    const funnel = stageFunnel(projects);
    expect(funnel).toHaveLength(10);
    expect(funnel.map((s) => s.name)).not.toContain("Planning");
    expect(funnel[0]).toEqual({ name: "Draft", count: 0 });
    expect(funnel.find((s) => s.name === "Assessment")?.count).toBe(1);
    expect(funnel.at(-1)).toEqual({ name: "Done", count: 1 });
  });

  it("tren 12 bulan: proyek dimulai per bulan dan proyek Done per bulan berakhir", () => {
    const trend = monthlyTrend(projects, 12, TODAY);
    expect(trend).toHaveLength(12);
    const total = (k: "started" | "completed") => trend.reduce((s, t) => s + t[k], 0);
    // Proyek 3 mulai Desember (di luar jendela) tidak dihitung
    expect(total("started")).toBe(3);
    expect(total("completed")).toBe(1);
    expect(trend.at(-1)?.started).toBe(1); // November 2026
  });

  it("report hanya diminta untuk proyek Assessment ke atas", () => {
    expect(projects.filter(hasFindingsStage).map((p) => p.project_id)).toEqual([1, 2, 4]);
  });
});

describe("temuan & risiko", () => {
  const a = proj(1, "Assessment", null, null);
  const b = proj(2, "Remediasi", null, null);
  const reports = [
    report(a, [finding("High", "open"), finding("High", "closed"), finding("Low", "remediated")]),
    report(b, [finding("Critical", "reopened"), finding("Medium", "open")]),
  ];

  it("menjumlahkan severity dan status, serta severity khusus temuan terbuka", () => {
    const t = findingTotals(reports);
    expect(t.total).toBe(5);
    expect(t.open).toBe(3);
    expect(t.bySeverity.High).toBe(2);
    expect(t.openBySeverity).toMatchObject({ Critical: 1, High: 1, Medium: 1, Low: 0 });
    expect(t.byStatus).toEqual({ open: 2, reopened: 1, remediated: 1, closed: 1 });
  });

  it("proyek berisiko diurutkan Critical lalu High, hanya dari temuan terbuka", () => {
    const rows = riskiestProjects(reports);
    expect(rows.map((r) => [r.project.project_id, r.critical, r.high, r.open])).toEqual([
      [2, 1, 0, 2],
      [1, 0, 1, 1],
    ]);
  });
});

describe("tim, katalog & aktivitas", () => {
  it("komposisi role berurutan dari admin ke staf", () => {
    const users = [user(1, "pentester"), user(2, "super_admin"), user(3, "pentester")];
    expect(roleComposition(users)).toEqual([
      { role: "super_admin", count: 1 },
      { role: "pentester", count: 2 },
    ]);
  });

  it("kapasitas menandai pentester yang melewati batas mandays", () => {
    const users = [user(1, "pentester"), user(2, "pentester"), user(3, "project_manager")];
    const cap = capacity(users, { 1: { mandays: 25, projects: [] }, 2: { mandays: 4, projects: [] } });
    expect(cap.pentesters).toBe(2);
    expect(cap.team).toBe(3);
    expect(cap.used).toBe(29);
    expect(cap.overloaded.map((o) => o.user.sys_user_id)).toEqual([1]);
    expect(cap.ranking[0]?.mandays).toBe(25);
  });

  it("statistik katalog menghitung rasio persetujuan dari yang sudah ditinjau", () => {
    const item = { vulna_id: 1, title: "x", severity: "High", status: "approved" as const };
    expect(catalogStats([item, item, item], [item], [item])).toMatchObject({
      approved: 3,
      pending: 1,
      rejected: 1,
      approvalRate: 75,
    });
    expect(catalogStats([], [item], []).approvalRate).toBeNull();
  });

  it("aktivitas digabung lintas proyek dan diurutkan dari yang terbaru", () => {
    const p1 = proj(1, "Assessment", null, null, "2026-11-10");
    const p2 = proj(2, "Scoping", null, null, "2026-11-18");
    const logs = new Map([
      [1, [{ status_process_log_id: 1, status_name: "Assessment", status_create_at: "2026-11-10T08:00:00Z" }]],
      [2, [{ status_process_log_id: 2, status_name: "Scoping", status_create_at: "2026-11-18T08:00:00Z" }]],
    ]);
    expect(recentActivity(logs, [p1, p2]).map((a) => a.project.project_id)).toEqual([2, 1]);
    expect(recentlyUpdated([p1, p2], 1).map((p) => p.project_id)).toEqual([2]);
  });
});
