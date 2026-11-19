/**
 * Helper bersama dashboard role pelaksana (Pentester, Technical Writer):
 * jadwal tahap untuk urutan prioritas kerja dan jendela linimasa pribadi.
 */
import type { Project, ProjectDetail } from "@/entities/project";
import { addDaysIso, mondayOf, timeProgress, toDayNo, todayIso } from "./techlead-metrics";

export const statusOf = (p: Project) => p.status?.status_name ?? "";
export const daysBetween = (from: string, to: string) => toDayNo(to) - toDayNo(from);

/** Status yang sudah punya temuan (Assessment ke atas, sebelum Done). */
const HAS_FINDINGS = new Set([
  "Assessment",
  "Analysis",
  "Initial Report",
  "Remediasi",
  "Retesting",
  "Final Report Drafting",
  "Final Presentation",
]);
export const hasFindings = (p: Project) => HAS_FINDINGS.has(statusOf(p));

export const stageOf = (detail: ProjectDetail | undefined, name: string) =>
  detail?.stages.find((s) => s.stage_name === name);

export const latestDate = (dates: (string | null | undefined)[]) =>
  dates.filter((d): d is string => !!d).sort().at(-1) ?? null;
export const earliestDate = (dates: (string | null | undefined)[]) =>
  dates.filter((d): d is string => !!d).sort()[0] ?? null;

/* ---------- Prioritas kerja ---------- */

export interface BaseWorkItem {
  project: Project;
  status: string;
  /** true = tahap sedang menunggu role ini. */
  myTurn: boolean;
  /** Tanggal acuan: tenggat tahap (giliran sendiri) atau mulai tahap role ini berikutnya. */
  date: string | null;
  /** "Tenggat Assessment", "Mulai Retesting", ... */
  dateLabel: string;
  days: number | null;
  /** Persen waktu tahap yang sudah terpakai (hanya giliran sendiri). */
  progress: number | null;
}

interface ScheduleInput {
  project: Project;
  detail: ProjectDetail | undefined;
  myTurn: boolean;
  /** Tahap role ini berikutnya bila sekarang dipegang role lain. */
  nextStage?: string;
  /** Tanggal yang lebih spesifik dari tanggal tahap (mis. penugasan mandays sendiri). */
  turnStart?: string | null;
  turnEnd?: string | null;
  nextStart?: string | null;
}

/**
 * Tanggal acuan sebuah proyek. Giliran sendiri: akhir tahap berjalan; selain
 * itu: mulai tahap berikutnya. Jatuh ke end_date proyek bila tahap belum dijadwalkan.
 */
export function stageSchedule(
  { project, detail, myTurn, nextStage, turnStart, turnEnd, nextStart }: ScheduleInput,
  today = todayIso(),
): BaseWorkItem {
  const status = statusOf(project);
  let date: string | null;
  let dateLabel: string;
  let progress: number | null = null;

  if (myTurn) {
    const stage = stageOf(detail, status);
    date = turnEnd ?? stage?.end_date ?? project.end_date ?? null;
    dateLabel = `Tenggat ${status}`;
    progress = timeProgress(turnStart ?? stage?.start_date, date, today);
  } else {
    date = nextStart ?? (nextStage ? stageOf(detail, nextStage)?.start_date : null) ?? null;
    dateLabel = nextStage ? `Mulai ${nextStage}` : "Jadwal";
    if (!date) {
      date = project.end_date ?? null;
      dateLabel = "Tenggat proyek";
    }
  }
  return { project, status, myTurn, date, dateLabel, days: date ? daysBetween(today, date) : null, progress };
}

/** Giliran sendiri lebih dulu, lalu tanggal acuan terdekat (terlambat paling atas). */
export const byPriority = (a: BaseWorkItem, b: BaseWorkItem) =>
  Number(b.myTurn) - Number(a.myTurn) || (a.days ?? Infinity) - (b.days ?? Infinity);

/* ---------- Linimasa pribadi ---------- */

export interface TimelineEntry {
  key: number | string;
  projectId: number;
  projectName: string;
  /** Baris kedua: nama aset atau nama tahap. */
  sub: string;
  start: string;
  end: string;
  /** Teks di dalam batang: "8 MD", "Initial Report". */
  tag: string;
  overdue: boolean;
}

export interface TimelineBar extends TimelineEntry {
  /** Posisi & lebar dalam persen jendela. */
  left: number;
  width: number;
}

export interface MyTimeline {
  start: string;
  end: string;
  /** Senin tiap minggu di jendela. */
  weeks: string[];
  /** Posisi garis hari ini dalam persen, null bila di luar jendela. */
  todayAt: number | null;
  bars: TimelineBar[];
  /** Pasangan proyek yang jadwalnya saling tumpang tindih. */
  clashes: number;
}

/** Jendela `weeks` minggu mulai Senin minggu ini; entri di luar jendela dibuang. */
export function buildTimeline(entries: readonly TimelineEntry[], weeks = 6, today = todayIso()): MyTimeline {
  const start = mondayOf(today);
  const end = addDaysIso(start, weeks * 7 - 1);
  const s = toDayNo(start);
  const span = weeks * 7;
  const pct = (iso: string) => ((toDayNo(iso) - s) / span) * 100;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));

  const bars: TimelineBar[] = entries
    .filter((e) => e.end >= start && e.start <= end)
    .map((e) => {
      const left = clamp(pct(e.start));
      return { ...e, left, width: Math.max(1.5, clamp(pct(addDaysIso(e.end, 1))) - left) };
    })
    .sort((a, b) => a.start.localeCompare(b.start) || a.projectName.localeCompare(b.projectName));

  let clashes = 0;
  for (let i = 0; i < bars.length; i++)
    for (let j = i + 1; j < bars.length; j++) {
      const a = bars[i]!;
      const b = bars[j]!;
      if (a.projectId !== b.projectId && a.start <= b.end && b.start <= a.end) clashes++;
    }

  const t = pct(today);
  return {
    start,
    end,
    weeks: Array.from({ length: weeks }, (_, i) => addDaysIso(start, i * 7)),
    todayAt: t >= 0 && t <= 100 ? t : null,
    bars,
    clashes,
  };
}
