import { describe, expect, it } from "vitest";
import type { ProjectReport } from "@/entities/finding";
import type { Project, ProjectDetail } from "@/entities/project";
import { findingVolume, qualityByProject, qualityIssues, reportQueue, writerTimeline } from "./writer-metrics";

const TODAY = "2026-11-19";

const proj = (id: number, status: string): Project => ({
  project_id: id,
  project_name: `Proyek ${id}`,
  client_name: "Klien",
  total_mandays: 0,
  projected_mandays: 0,
  pm_id: 1,
  start_date: "2026-11-01",
  end_date: "2026-12-31",
  status: { status_process_id: id, status_name: status },
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

const detail = (p: Project, stages: ReturnType<typeof stage>[]) =>
  ({ ...p, assets: [], resources: [], mandays: [], stages }) as ProjectDetail;

type F = ProjectReport["findings"][number];
const f = (id: number, severity: string, extra: Partial<F> = {}): F =>
  ({
    vulna_id: id,
    custom_title: `T${id}`,
    severity,
    status: "open",
    cvss_score: "7.5",
    endpoint: "/api",
    evidences: [{ evidence_id: 1 }],
    ...extra,
  }) as F;

const report = (p: Project, findings: F[]) => ({ project: p, findings }) as unknown as ProjectReport;

const projects = [proj(1, "Initial Report"), proj(2, "Analysis"), proj(3, "Final Report Drafting"), proj(4, "Remediasi")];
const details = new Map<number, ProjectDetail>([
  [1, detail(projects[0]!, [stage("Initial Report", "2026-11-16", "2026-11-24")])],
  [2, detail(projects[1]!, [stage("Initial Report", "2026-11-26", "2026-12-04")])],
  [3, detail(projects[2]!, [stage("Final Report Drafting", "2026-11-10", "2026-11-18")])],
  [4, detail(projects[3]!, [stage("Final Report Drafting", "2026-12-10", "2026-12-15")])],
]);
const reports = new Map<number, ProjectReport>([
  [1, report(projects[0]!, [f(1, "High"), f(2, "Critical", { evidences: [], cvss_score: null }), f(3, "Low", { endpoint: "" })])],
  [2, report(projects[1]!, [f(4, "Medium")])],
]);

describe("antrean report", () => {
  it("stage writer lebih dulu (terlambat paling atas), lalu mulai stage writer berikutnya", () => {
    const rows = reportQueue(projects, details, reports, TODAY);
    expect(rows.map((r) => [r.project.project_id, r.myTurn, r.dateLabel, r.days])).toEqual([
      [3, true, "Tenggat Final Report Drafting", -1],
      [1, true, "Tenggat Initial Report", 5],
      [2, false, "Mulai Initial Report", 7],
      [4, false, "Mulai Final Report Drafting", 21],
    ]);
    const first = rows.find((r) => r.project.project_id === 1)!;
    expect([first.findings, first.severe, first.incomplete, first.loaded]).toEqual([3, 2, 2, true]);
    expect(rows.find((r) => r.project.project_id === 3)!.loaded).toBe(false);
  });
});

describe("kelengkapan findings", () => {
  it("menandai bukti, CVSS, dan endpoint yang kosong", () => {
    expect(qualityIssues(f(9, "High", { evidences: null, cvss_score: null, endpoint: " " }))).toEqual([
      "evidence",
      "cvss",
      "endpoint",
    ]);
    expect(qualityIssues(f(9, "High"))).toEqual([]);
    expect(qualityIssues(f(9, "High", { cvss_score: " " }))).toEqual(["cvss"]);
    expect(qualityIssues(f(9, "High", { cvss_score: "0" }))).toEqual([]);
  });

  it("per proyek, giliran writer dulu, severity tertinggi dulu", () => {
    const rows = qualityByProject(projects, reports);
    expect(rows.map((r) => r.project.project_id)).toEqual([1, 2]);
    expect(rows[0]).toMatchObject({ total: 3, complete: 1, missing: { evidence: 1, cvss: 1, endpoint: 1 } });
    expect(rows[0]!.incomplete.map((x) => x.finding.vulna_id)).toEqual([2, 3]);
  });
});

describe("linimasa & volume", () => {
  it("hanya stage report di jendela 6 minggu", () => {
    const t = writerTimeline(projects, details, 6, TODAY);
    expect(t.bars.map((b) => b.key)).toEqual(["3-Final Report Drafting", "1-Initial Report", "2-Initial Report", "4-Final Report Drafting"]);
    expect(t.bars[0]!.overdue).toBe(true);
    expect(t.bars[1]!.tag).toBe("7 hari kerja");
  });

  it("volume findings per severity, terbanyak dulu", () => {
    const [top] = findingVolume(projects, reports);
    expect(top!.project.project_id).toBe(1);
    expect(top!.bySeverity).toMatchObject({ Critical: 1, High: 1, Low: 1, Medium: 0 });
  });
});
