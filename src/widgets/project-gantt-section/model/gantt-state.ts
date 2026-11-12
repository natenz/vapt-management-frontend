import { addDays, differenceInCalendarDays, format, startOfDay } from "date-fns";
import type { ProjectDetail } from "@/entities/project";
import type { GanttState } from "@/shared/ui/gantt";

// Tahap pengujian (kerja yang dijadwalkan di trx_mandays) sudah lewat begitu proyek keluar dari Pentest.
const PENTEST_FINISHED = ["Reporting", "Remediation", "Retest", "Final Report", "Done"];

/**
 * Warna batang Gantt. BE tidak pernah mengubah trx_mandays.status (semua tetap "planned", termasuk di
 * proyek Done), jadi status proyek jadi sumber kebenaran: selesai tahap Pentest => batang "done".
 * ponytail: tidak ada status per-penugasan selama Pentest selain dari mandays.status/tanggal mulai.
 */
export function mandaysState(m: { status?: string | null; start_date?: string | null }, projectStatus: string, today = new Date()): GanttState {
  if (m.status === "done" || PENTEST_FINISHED.includes(projectStatus)) return "done";
  if (m.status === "in_progress") return "current";
  if (projectStatus === "Pentest" && m.start_date && new Date(m.start_date) <= today) return "current";
  return "todo";
}

export type StageScheduleItem = {
  id: string;
  stageId?: number;
  label: string;
  owner: string;
  startsAt: string;
  endsAt: string;
  state: GanttState;
  source: "server" | "mandays" | "estimated";
};

const STAGE_DEFS: readonly { id: string; label: string; clientOwned?: boolean; span: readonly [number, number] }[] = [
  { id: "scoping", label: "Scoping", span: [0.0, 0.0] },
  { id: "assessment", label: "Assessment", span: [0.0, 0.07] },
  { id: "analysis", label: "Analysis", span: [0.07, 0.14] },
  { id: "initial-report", label: "Initial Report", span: [0.14, 0.14] },
  { id: "remediasi", label: "Remediasi", clientOwned: true, span: [0.33, 0.6] },
  { id: "retesting", label: "Retesting", span: [0.8, 0.87] },
  { id: "final-report-drafting", label: "Final Report Drafting", span: [0.93, 0.93] },
  { id: "final-presentation", label: "Final Presentation", span: [1.0, 1.0] },
];

function activeStageIndex(statusName: string): number {
  switch (statusName) {
    case "Pentest":
      return 1;
    case "Reporting":
      return 3;
    case "Remediation":
      return 4;
    case "Retest":
      return 5;
    case "Final Report":
      return 6;
    case "Done":
      return STAGE_DEFS.length;
    default:
      return -1;
  }
}

function parseDay(v?: string | null): Date | null {
  if (!v) return null;
  const d = startOfDay(new Date(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Menurunkan 8 baris timeline standar VAPT (Scoping s/d Final Presentation) beserta Owner-nya.
 * ponytail: BE belum menyimpan jadwal terpisah untuk ke-8 tahap, jadi rentang diturunkan proporsional
 * dari start_date..end_date proyek (Assessment memakai min..max trx_mandays jika ada).
 */
export function buildStageSchedule(
  project: Pick<ProjectDetail, "start_date" | "end_date" | "client_name" | "status" | "mandays"> & {
    stages?: ProjectDetail["stages"];
  },
): StageScheduleItem[] {
  const currentIdx = activeStageIndex(project.status?.status_name ?? "");
  const serverStages = (project.stages ?? []).filter((s) => s.start_date && s.end_date);
  if (serverStages.length > 0) {
    return serverStages.map((s, idx) => {
      const state: GanttState =
        currentIdx >= STAGE_DEFS.length || idx < currentIdx
          ? "done"
          : idx === currentIdx
            ? "current"
            : "todo";
      return {
        id: String(s.stage_id),
        stageId: s.stage_id,
        label: s.stage_name,
        owner: s.owner,
        startsAt: s.start_date!.slice(0, 10),
        endsAt: s.end_date!.slice(0, 10),
        state,
        source: "server",
      };
    });
  }

  const mdDates = project.mandays
    .flatMap((m) => [parseDay(m.start_date), parseDay(m.end_date)])
    .filter((d): d is Date => Boolean(d));
  const mdMin = mdDates.length ? mdDates.reduce((a, b) => (a < b ? a : b)) : null;
  const mdMax = mdDates.length ? mdDates.reduce((a, b) => (a > b ? a : b)) : null;

  const pStart = parseDay(project.start_date) ?? mdMin;
  const pEnd = parseDay(project.end_date) ?? mdMax;
  if (!pStart || !pEnd || pEnd < pStart) return [];

  const totalSpan = differenceInCalendarDays(pEnd, pStart);
  const clientOwner = project.client_name?.trim() || "Klien";

  return STAGE_DEFS.map((stage, idx) => {
    const startOffset = Math.round(stage.span[0] * totalSpan);
    const endOffset = Math.max(startOffset, Math.round(stage.span[1] * totalSpan));

    let startsAt = format(addDays(pStart, startOffset), "yyyy-MM-dd");
    let endsAt = format(addDays(pStart, endOffset), "yyyy-MM-dd");
    let source: StageScheduleItem["source"] = "estimated";

    if (stage.id === "assessment" && mdMin && mdMax && mdMax >= mdMin) {
      startsAt = format(mdMin, "yyyy-MM-dd");
      endsAt = format(mdMax, "yyyy-MM-dd");
      source = "mandays";
    }

    const state: GanttState =
      currentIdx >= STAGE_DEFS.length || idx < currentIdx
        ? "done"
        : idx === currentIdx
          ? "current"
          : "todo";

    return {
      id: stage.id,
      label: stage.label,
      owner: stage.clientOwned ? clientOwner : "Telkom",
      startsAt,
      endsAt,
      state,
      source,
    };
  });
}
