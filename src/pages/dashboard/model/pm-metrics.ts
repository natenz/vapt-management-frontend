/**
 * Agregasi dashboard Project Manager: proyek yang menunggu keputusan PM
 * (Scoping, Remediasi, Retesting), kesiapan Assessment, progres remediasi klien,
 * dan linimasa tahap berjalan seluruh proyek PM.
 *
 * BE sudah menyaring proyek PM (pm_id = diri sendiri, Scoping..Done). Tidak ada
 * lagi status Planning: proyek diserahkan Tech Lead langsung masuk Scoping, dan
 * PM menyiapkan aset & pentester di tahap itu (syarat BE untuk masuk Assessment).
 */
import type { ProjectReport } from "@/entities/finding";
import type { Project, ProjectDetail } from "@/entities/project";
import {
  buildTimeline,
  byPriority,
  daysBetween,
  stageOf,
  stageSchedule,
  statusOf,
  type BaseWorkItem,
  type MyTimeline,
  type TimelineEntry,
} from "./role-work";
import { todayIso, workingDays } from "./techlead-metrics";

/** Status yang menunggu tindakan PM. */
export const PM_TURN = ["Scoping", "Remediasi", "Retesting"] as const;

export const PM_NEXT_STEP: Record<string, string> = {
  Scoping: "Konfirmasi scope, isi aset, dan assign pentester",
  Assessment: "Pentester sedang menguji",
  Analysis: "Analisis dan validasi temuan",
  "Initial Report": "Tech Writer menyusun Initial Report",
  Remediasi: "Mulai Retesting setelah klien selesai",
  Retesting: "Tutup Retesting atau kembalikan ke Remediasi",
  "Final Report Drafting": "Tech Writer menyusun Final Report",
  "Final Presentation": "Presentasi hasil ke klien",
};

export const isPmTurn = (p: Project) => (PM_TURN as readonly string[]).includes(statusOf(p));

type Finding = ProjectReport["findings"][number];
const OPEN = new Set(["open", "reopened"]);

/* ---------- Penanganan temuan ---------- */

export interface FindingProgress {
  total: number;
  open: number;
  remediated: number;
  closed: number;
}

export function findingProgress(findings: readonly Finding[]): FindingProgress {
  const out = { total: findings.length, open: 0, remediated: 0, closed: 0 };
  for (const f of findings) {
    const s = f.status.toLowerCase();
    if (OPEN.has(s)) out.open++;
    else if (s === "remediated") out.remediated++;
    else if (s === "closed") out.closed++;
  }
  return out;
}

/* ---------- Perlu tindakan ---------- */

export interface PmItem extends BaseWorkItem {
  findings: FindingProgress | null;
}

/**
 * Semua proyek aktif PM. Giliran PM lebih dulu. Tanggal acuan = akhir tahap
 * yang sedang berjalan (siapa pun pemegangnya), karena PM memantau semuanya.
 */
export function pmQueue(
  projects: readonly Project[],
  details: ReadonlyMap<number, ProjectDetail>,
  reports: ReadonlyMap<number, ProjectReport>,
  today = todayIso(),
): PmItem[] {
  return projects
    .filter((p) => statusOf(p) !== "Done")
    .map((project) => {
      const base = stageSchedule({ project, detail: details.get(project.project_id), myTurn: true }, today);
      const report = reports.get(project.project_id);
      return {
        ...base,
        myTurn: isPmTurn(project),
        findings: report ? findingProgress(report.findings) : null,
      };
    })
    .sort(byPriority);
}

/* ---------- Kesiapan Assessment ---------- */

export interface AssessmentReadiness {
  project: Project;
  /** Hari menuju mulai tahap Assessment (fallback akhir Scoping). */
  startsIn: number | null;
  startDate: string | null;
  checklist: { label: string; done: boolean }[];
  ready: boolean;
}

/**
 * Syarat proyek Scoping untuk masuk Assessment. Dua syarat pertama ditegakkan
 * BE (aset ada, setiap aset punya pentester); tanpa itu Scoping tidak maju
 * otomatis meski tanggalnya lewat. Sisanya kelengkapan perencanaan.
 */
export function assessmentReadiness(
  projects: readonly Project[],
  details: ReadonlyMap<number, ProjectDetail>,
  today = todayIso(),
): AssessmentReadiness[] {
  return projects
    .filter((p) => statusOf(p) === "Scoping")
    .map((project) => {
      const d = details.get(project.project_id);
      const assets = d?.assets ?? [];
      const assigned = new Set((d?.mandays ?? []).map((m) => m.asset_id));
      const assetMd = assets.reduce((s, a) => s + a.mandays, 0);
      const quota = project.projected_mandays ?? 0;
      const startDate =
        stageOf(d, "Assessment")?.start_date ?? stageOf(d, "Scoping")?.end_date ?? project.start_date ?? null;
      const checklist = [
        { label: "Aset target terdaftar", done: assets.length > 0 },
        { label: "Setiap aset punya pentester", done: assets.length > 0 && assets.every((a) => assigned.has(a.assets_id)) },
        { label: "Mandays aset dalam jatah", done: assetMd > 0 && (quota === 0 || assetMd <= quota) },
        { label: "Jadwal tahap disusun", done: (d?.stages ?? []).some((s) => !!s.start_date) },
      ];
      return {
        project,
        startDate,
        startsIn: startDate ? daysBetween(today, startDate) : null,
        checklist,
        ready: checklist.every((c) => c.done),
      };
    })
    .sort((a, b) => (a.startsIn ?? Infinity) - (b.startsIn ?? Infinity));
}

/* ---------- Remediasi klien ---------- */

export interface RemediationRow {
  project: Project;
  progress: FindingProgress;
  /** Persen temuan yang sudah diperbaiki atau ditutup. */
  handled: number;
  /** Saran keputusan PM bila syaratnya terpenuhi. */
  hint: string | null;
}

/** Proyek Remediasi/Retesting dengan progres penanganan temuan klien. */
export function remediationProgress(
  projects: readonly Project[],
  reports: ReadonlyMap<number, ProjectReport>,
): RemediationRow[] {
  return projects
    .filter((p) => ["Remediasi", "Retesting"].includes(statusOf(p)) && reports.has(p.project_id))
    .map((project) => {
      const progress = findingProgress(reports.get(project.project_id)!.findings);
      const handled = progress.total ? Math.round(((progress.remediated + progress.closed) / progress.total) * 100) : 100;
      const status = statusOf(project);
      const hint =
        status === "Remediasi" && progress.open === 0
          ? "Semua temuan sudah diperbaiki. Siap mulai Retesting."
          : status === "Retesting" && progress.open === 0 && progress.remediated === 0
            ? "Semua temuan ditutup. Siap lanjut ke Final Report."
            : null;
      return { project, progress, handled, hint };
    })
    .sort((a, b) => Number(!!b.hint) - Number(!!a.hint) || a.handled - b.handled);
}

/* ---------- Linimasa tahap berjalan ---------- */

/** Tahap yang sedang berjalan di tiap proyek PM, jendela 6 minggu. */
export function pmTimeline(
  projects: readonly Project[],
  details: ReadonlyMap<number, ProjectDetail>,
  weeks = 6,
  today = todayIso(),
): MyTimeline {
  const entries: TimelineEntry[] = [];
  for (const p of projects) {
    const status = statusOf(p);
    const stage = stageOf(details.get(p.project_id), status);
    if (!stage?.start_date || !stage.end_date) continue;
    entries.push({
      key: p.project_id,
      projectId: p.project_id,
      projectName: p.project_name,
      sub: status,
      start: stage.start_date,
      end: stage.end_date,
      tag: `${workingDays(stage.start_date, stage.end_date)} hari kerja`,
      overdue: stage.end_date < today,
    });
  }
  return buildTimeline(entries, weeks, today);
}
