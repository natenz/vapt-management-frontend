import { describe, expect, it } from "vitest";
import type { ProjectReport } from "@/entities/finding";
import type { Project, ProjectDetail } from "@/entities/project";
import { kickoffReadiness, pmQueue, pmTimeline, remediationProgress } from "./pm-metrics";

const TODAY = "2026-11-19";

const proj = (id: number, status: string, extra: Partial<Project> = {}): Project => ({
  project_id: id,
  project_name: `Proyek ${id}`,
  client_name: "Klien",
  total_mandays: 0,
  projected_mandays: 10,
  pm_id: 1,
  start_date: "2026-11-01",
  end_date: "2026-12-31",
  status: { status_process_id: id, status_name: status },
  ...extra,
});

const stage = (name: string, start: string, end: string) => ({
  stage_id: 0,
  project_id: 0,
  sort_order: 0,
  stage_name: name,
  owner: "",
  start_date: start,
  end_date: end,
});

const detail = (p: Project, extra: Partial<ProjectDetail> = {}) =>
  ({ ...p, assets: [], resources: [], mandays: [], stages: [], ...extra }) as ProjectDetail;

type F = ProjectReport["findings"][number];
const f = (id: number, status: string) => ({ vulna_id: id, severity: "High", status }) as F;
const report = (p: Project, findings: F[]) => ({ project: p, findings }) as unknown as ProjectReport;

const projects = [
  proj(1, "Planning", { start_date: "2026-11-23" }),
  proj(2, "Remediasi"),
  proj(3, "Assessment"),
  proj(4, "Retesting"),
];
const details = new Map<number, ProjectDetail>([
  [
    1,
    detail(projects[0]!, {
      assets: [{ assets_id: 1, asset_name: "Web", asset_type: "web", mandays: 12, project_id: 1 }],
      resources: [{ resource_id: 1, user_id: 1 }],
    }),
  ],
  [2, detail(projects[1]!, { stages: [stage("Remediasi", "2026-11-10", "2026-11-28")] })],
  [3, detail(projects[2]!, { stages: [stage("Assessment", "2026-11-16", "2026-11-20")] })],
  [4, detail(projects[3]!, { stages: [stage("Retesting", "2026-11-12", "2026-11-18")] })],
]);
const reports = new Map<number, ProjectReport>([
  [2, report(projects[1]!, [f(1, "remediated"), f(2, "closed")])],
  [4, report(projects[3]!, [f(3, "open"), f(4, "remediated")])],
]);

describe("perlu tindakan PM", () => {
  it("Planning/Remediasi/Retesting dulu; tanggal = akhir tahap berjalan, Planning = target kickoff", () => {
    const rows = pmQueue(projects, details, reports, TODAY);
    expect(rows.map((r) => [r.project.project_id, r.myTurn, r.dateLabel, r.days])).toEqual([
      [4, true, "Tenggat Retesting", -1],
      [1, true, "Target kickoff", 4],
      [2, true, "Tenggat Remediasi", 9],
      [3, false, "Tenggat Assessment", 1],
    ]);
    expect(rows[0]!.findings).toEqual({ total: 2, open: 1, remediated: 1, closed: 0 });
    expect(rows[1]!.progress).toBeNull();
  });
});

describe("kesiapan kickoff", () => {
  it("menandai syarat yang belum terpenuhi, termasuk mandays aset melebihi jatah", () => {
    const [k] = kickoffReadiness(projects, details, TODAY);
    expect(k!.startsIn).toBe(4);
    expect(k!.checklist.map((c) => c.done)).toEqual([true, true, false, false, false]);
    expect(k!.ready).toBe(false);
  });
});

describe("remediasi & linimasa", () => {
  it("menyarankan Retesting bila tak ada temuan terbuka, urut yang siap diputuskan", () => {
    const rows = remediationProgress(projects, reports);
    expect(rows.map((r) => [r.project.project_id, r.handled, !!r.hint])).toEqual([
      [2, 100, true],
      [4, 50, false],
    ]);
  });

  it("satu batang tahap berjalan per proyek, terlambat ditandai", () => {
    const t = pmTimeline(projects, details, 6, TODAY);
    expect(t.bars.map((b) => [b.projectId, b.sub, b.overdue])).toEqual([
      [2, "Remediasi", false],
      [4, "Retesting", true],
      [3, "Assessment", false],
    ]);
  });
});
