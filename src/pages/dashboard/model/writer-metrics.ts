/**
 * Agregasi dashboard Technical Writer: antrean laporan dari tenggat terdekat,
 * linimasa tahap laporan, kelengkapan temuan (bahan QA), dan volume temuan
 * per proyek untuk memperkirakan beban penulisan.
 *
 * BE sudah menyaring proyek writer (ditugaskan + Scoping..Final Presentation).
 * Temuan diambil dari report proyek karena hanya endpoint itu yang memuat evidence.
 */
import type { ProjectReport } from "@/entities/finding";
import type { Project, ProjectDetail } from "@/entities/project";
import { SEVERITIES } from "@/shared/api/schemas";
import {
  buildTimeline,
  byPriority,
  hasFindings,
  stageSchedule,
  statusOf,
  type BaseWorkItem,
  type MyTimeline,
  type TimelineEntry,
} from "./role-work";
import { todayIso, workingDays } from "./techlead-metrics";

/** Tahap yang dikerjakan langsung oleh Technical Writer. */
export const WRITER_TURN = ["Initial Report", "Final Report Drafting", "Final Presentation"] as const;

/** Tahap writer berikutnya untuk status yang sedang dipegang role lain. */
const NEXT_STAGE: Record<string, string> = {
  Scoping: "Initial Report",
  Assessment: "Initial Report",
  Analysis: "Initial Report",
  Remediasi: "Final Report Drafting",
  Retesting: "Final Report Drafting",
};

export const WRITER_NEXT_STEP: Record<string, string> = {
  Scoping: "Pelajari scope dan asset klien",
  Assessment: "Pantau findings yang mulai masuk",
  Analysis: "Tinjau findings yang sudah divalidasi",
  "Initial Report": "Koreksi findings dan susun Initial Report",
  Remediasi: "Klien memperbaiki findings",
  Retesting: "Pentester menguji ulang",
  "Final Report Drafting": "Susun Final Report",
  "Final Presentation": "Presentasikan hasil ke klien",
};

export { hasFindings };

export const isWriterTurn = (p: Project) => (WRITER_TURN as readonly string[]).includes(statusOf(p));

type Finding = ProjectReport["findings"][number];
type SeverityName = (typeof SEVERITIES)[number];

/* ---------- Kelengkapan temuan ---------- */

export type QualityIssue = "evidence" | "cvss" | "endpoint";
export const QUALITY_LABEL: Record<QualityIssue, string> = {
  evidence: "Tanpa bukti",
  cvss: "Tanpa CVSS",
  endpoint: "Tanpa endpoint",
};

/** Data yang belum ada pada temuan; laporan tidak bisa disusun tanpanya. */
export function qualityIssues(f: Finding): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!f.evidences?.length) issues.push("evidence");
  if (!f.cvss_score?.trim()) issues.push("cvss");
  if (!f.endpoint?.trim()) issues.push("endpoint");
  return issues;
}

const severityRank = (s: string) => {
  const i = SEVERITIES.findIndex((v) => v.toLowerCase() === s.toLowerCase());
  return i < 0 ? SEVERITIES.length : i;
};

export interface ProjectQuality {
  project: Project;
  total: number;
  complete: number;
  missing: Record<QualityIssue, number>;
  /** Temuan bermasalah, severity tertinggi dulu. */
  incomplete: { finding: Finding; issues: QualityIssue[] }[];
}

/**
 * Kelengkapan temuan per proyek. Hanya proyek yang temuannya akan segera
 * dilaporkan (Analysis dan tahap writer). Giliran writer lebih dulu, lalu yang
 * paling banyak kekurangannya.
 */
export function qualityByProject(
  projects: readonly Project[],
  reports: ReadonlyMap<number, ProjectReport>,
): ProjectQuality[] {
  const relevant = new Set(["Analysis", "Retesting", ...WRITER_TURN]);
  return projects
    .filter((p) => relevant.has(statusOf(p)) && reports.has(p.project_id))
    .map((project) => {
      const findings = reports.get(project.project_id)!.findings;
      const missing: Record<QualityIssue, number> = { evidence: 0, cvss: 0, endpoint: 0 };
      const incomplete: ProjectQuality["incomplete"] = [];
      for (const finding of findings) {
        const issues = qualityIssues(finding);
        issues.forEach((i) => missing[i]++);
        if (issues.length) incomplete.push({ finding, issues });
      }
      incomplete.sort((a, b) => severityRank(a.finding.severity) - severityRank(b.finding.severity));
      return { project, total: findings.length, complete: findings.length - incomplete.length, missing, incomplete };
    })
    .sort(
      (a, b) =>
        Number(isWriterTurn(b.project)) - Number(isWriterTurn(a.project)) ||
        b.incomplete.length - a.incomplete.length,
    );
}

/* ---------- Antrean laporan ---------- */

export interface WriterItem extends BaseWorkItem {
  findings: number;
  /** Critical + High. */
  severe: number;
  /** Temuan yang belum lengkap datanya. */
  incomplete: number;
  /** Report sudah termuat (angka temuan bisa dipercaya). */
  loaded: boolean;
}

export function reportQueue(
  projects: readonly Project[],
  details: ReadonlyMap<number, ProjectDetail>,
  reports: ReadonlyMap<number, ProjectReport>,
  today = todayIso(),
): WriterItem[] {
  return projects
    .filter((p) => statusOf(p) !== "Done")
    .map((project) => {
      const status = statusOf(project);
      const findings = reports.get(project.project_id)?.findings ?? [];
      return {
        ...stageSchedule(
          {
            project,
            detail: details.get(project.project_id),
            myTurn: isWriterTurn(project),
            nextStage: NEXT_STAGE[status],
          },
          today,
        ),
        findings: findings.length,
        severe: findings.filter((f) => severityRank(f.severity) <= 1).length,
        incomplete: findings.filter((f) => qualityIssues(f).length > 0).length,
        loaded: reports.has(project.project_id),
      };
    })
    .sort(byPriority);
}

/* ---------- Linimasa tahap laporan ---------- */

/** Tahap laporan (Initial Report, Final Report Drafting, Final Presentation) di jendela 6 minggu. */
export function writerTimeline(
  projects: readonly Project[],
  details: ReadonlyMap<number, ProjectDetail>,
  weeks = 6,
  today = todayIso(),
): MyTimeline {
  const entries: TimelineEntry[] = [];
  for (const p of projects) {
    for (const s of details.get(p.project_id)?.stages ?? []) {
      if (!(WRITER_TURN as readonly string[]).includes(s.stage_name) || !s.start_date || !s.end_date) continue;
      entries.push({
        key: `${p.project_id}-${s.stage_name}`,
        projectId: p.project_id,
        projectName: p.project_name,
        sub: s.stage_name,
        start: s.start_date,
        end: s.end_date,
        tag: `${workingDays(s.start_date, s.end_date)} hari kerja`,
        overdue: s.end_date < today && statusOf(p) === s.stage_name,
      });
    }
  }
  return buildTimeline(entries, weeks, today);
}

/* ---------- Volume temuan ---------- */

export interface FindingVolume {
  project: Project;
  total: number;
  bySeverity: Record<SeverityName, number>;
}

/** Jumlah temuan per severity per proyek, terbanyak dulu: perkiraan beban penulisan. */
export function findingVolume(
  projects: readonly Project[],
  reports: ReadonlyMap<number, ProjectReport>,
): FindingVolume[] {
  return projects
    .filter((p) => reports.has(p.project_id))
    .map((project) => {
      const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<SeverityName, number>;
      const findings = reports.get(project.project_id)!.findings;
      for (const f of findings) {
        const sev = SEVERITIES[severityRank(f.severity)] ?? "Informational";
        bySeverity[sev]++;
      }
      return { project, total: findings.length, bySeverity };
    })
    .sort((a, b) => b.total - a.total);
}
