import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  max as maxDate,
  min as minDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  doesProjectOverlapPeriod,
  isProjectEligibleForSchedule,
} from "./metrics";
import type { Granularity, MetricTrendPoint } from "./metrics";
import type { Project, ProjectStatus } from "./types";
import { formatDateRangeLabel, type DateRange } from "@/shared/lib/date-range";

export type { DateRange };

/** Batas jumlah titik agar grafik tetap terbaca dan ringan dirender. */
export const MAX_TREND_POINTS = 400;

export const GRANULARITY_ORDER: Granularity[] = ["day", "week", "month", "year"];

const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

const toIso = (d: Date) => format(d, "yyyy-MM-dd");

/** Awal bucket (snapshot) yang memuat tanggal `d`. */
function startOfBucket(d: Date, granularity: Granularity): Date {
  if (granularity === "day") return startOfDay(d);
  if (granularity === "week") return startOfWeek(d, WEEK_OPTIONS);
  if (granularity === "month") return startOfMonth(d);
  return startOfYear(d);
}

function endOfBucket(d: Date, granularity: Granularity): Date {
  if (granularity === "day") return endOfDay(d);
  if (granularity === "week") return endOfWeek(d, WEEK_OPTIONS);
  if (granularity === "month") return endOfMonth(d);
  return endOfYear(d);
}

function nextBucket(d: Date, granularity: Granularity): Date {
  if (granularity === "day") return addDays(d, 1);
  if (granularity === "week") return addWeeks(d, 1);
  if (granularity === "month") return addMonths(d, 1);
  return addYears(d, 1);
}

/** Rentang default: seluruh tahun berjalan. */
export function getDefaultScheduleRange(today: Date = new Date()): DateRange {
  return { start: startOfYear(today), end: startOfDay(endOfYear(today)) };
}

/** Jumlah snapshot yang dihasilkan sebuah granularitas pada rentang tertentu. */
export function countTrendBuckets(range: DateRange, granularity: Granularity): number {
  const { start, end } = range;
  if (granularity === "day") return differenceInCalendarDays(end, start) + 1;
  if (granularity === "week") {
    return (
      Math.floor(
        differenceInCalendarDays(
          startOfWeek(end, WEEK_OPTIONS),
          startOfWeek(start, WEEK_OPTIONS),
        ) / 7,
      ) + 1
    );
  }
  if (granularity === "month") return differenceInCalendarMonths(end, start) + 1;
  return end.getFullYear() - start.getFullYear() + 1;
}

export function isGranularityAllowed(range: DateRange, granularity: Granularity): boolean {
  return countTrendBuckets(range, granularity) <= MAX_TREND_POINTS;
}

/**
 * Pilih granularitas yang valid untuk rentang: pertahankan pilihan saat ini
 * bila masih valid, jika tidak naik ke granularitas yang lebih kasar.
 */
export function resolveGranularity(range: DateRange, preferred: Granularity): Granularity {
  const startIdx = GRANULARITY_ORDER.indexOf(preferred);
  for (let i = startIdx; i < GRANULARITY_ORDER.length; i++) {
    const g = GRANULARITY_ORDER[i];
    if (g && isGranularityAllowed(range, g)) return g;
  }
  return "year";
}

/** Label rentang ringkas berbahasa Indonesia (lihat `formatDateRangeLabel`). */
export const formatRangeLabel = formatDateRangeLabel;

/**
 * Geser rentang satu langkah ke depan/belakang dengan panjang yang sama.
 * Rentang yang pas di batas bulan (mis. satu tahun penuh) digeser per bulan
 * kalender agar tetap pas di batas bulan; selain itu digeser per hari.
 */
export function shiftDateRange(range: DateRange, direction: 1 | -1): DateRange {
  const { start, end } = range;
  const isMonthAligned =
    start.getDate() === 1 && isSameDay(end, startOfDay(endOfMonth(end)));

  if (isMonthAligned) {
    const months = differenceInCalendarMonths(end, start) + 1;
    const newStart = addMonths(start, months * direction);
    return {
      start: newStart,
      end: startOfDay(endOfMonth(addMonths(newStart, months - 1))),
    };
  }

  const days = differenceInCalendarDays(end, start) + 1;
  return { start: addDays(start, days * direction), end: addDays(end, days * direction) };
}

function formatBucketLabels(
  bucketStart: Date,
  bucketEnd: Date,
  granularity: Granularity,
  multiYear: boolean,
): { label: string; dateStr: string } {
  if (granularity === "day") {
    return {
      label: format(bucketStart, multiYear ? "d MMM yy" : "d MMM", { locale: idLocale }),
      dateStr: format(bucketStart, "EEEE, d MMMM yyyy", { locale: idLocale }),
    };
  }
  if (granularity === "week") {
    return {
      label: format(bucketStart, multiYear ? "d MMM yy" : "d MMM", { locale: idLocale }),
      dateStr: `Minggu ${formatRangeLabel({ start: bucketStart, end: bucketEnd })}`,
    };
  }
  if (granularity === "month") {
    return {
      label: format(bucketStart, multiYear ? "MMM yy" : "MMM", { locale: idLocale }),
      dateStr: format(bucketStart, "MMMM yyyy", { locale: idLocale }),
    };
  }
  return {
    label: String(bucketStart.getFullYear()),
    dateStr: `Tahun ${bucketStart.getFullYear()}`,
  };
}

export interface BuildScheduleTrendOptions {
  statuses?: ProjectStatus[];
  granularity: Granularity;
  range: DateRange;
}

export interface ScheduleTrendResult {
  trend: MetricTrendPoint[];
  /** Jumlah proyek unik yang jadwalnya bertumpukan dengan rentang terpilih. */
  totalScheduled: number;
}

/**
 * Bangun deret snapshot jadwal proyek di dalam rentang terpilih.
 * Setiap snapshot mengikuti batas kalender granularitas (minggu mulai Senin),
 * dipotong pada tepi rentang, lalu dihitung dengan aturan overlap yang sama
 * seperti `calculateProjectMetrics`.
 */
export function buildScheduleTrend(
  projects: Project[],
  { statuses, granularity, range }: BuildScheduleTrendOptions,
): ScheduleTrendResult {
  const rangeStart = startOfDay(minDate([range.start, range.end]));
  const rangeEnd = startOfDay(maxDate([range.start, range.end]));
  const safeGranularity = resolveGranularity({ start: rangeStart, end: rangeEnd }, granularity);

  const statusMap = statuses
    ? new Map<number, string>(statuses.map((s) => [s.status_process_id, s.status_name]))
    : undefined;

  const eligible = projects.flatMap((project) => {
    const result = isProjectEligibleForSchedule(project, statusMap);
    return result.valid && result.startDate && result.endDate
      ? [{ project, startDate: result.startDate, endDate: result.endDate }]
      : [];
  });

  const collect = (fromIso: string, toIsoStr: string) => {
    const seen = new Set<number>();
    const projectIds: number[] = [];
    const projectNames: string[] = [];
    for (const item of eligible) {
      if (
        !seen.has(item.project.project_id) &&
        doesProjectOverlapPeriod(item.startDate, item.endDate, fromIso, toIsoStr)
      ) {
        seen.add(item.project.project_id);
        projectIds.push(item.project.project_id);
        projectNames.push(item.project.project_name);
      }
    }
    return { projectIds, projectNames };
  };

  const multiYear = rangeStart.getFullYear() !== rangeEnd.getFullYear();
  const trend: MetricTrendPoint[] = [];
  let cursor = startOfBucket(rangeStart, safeGranularity);

  while (cursor <= rangeEnd) {
    const bucketStart = maxDate([cursor, rangeStart]);
    const bucketEnd = startOfDay(minDate([endOfBucket(cursor, safeGranularity), rangeEnd]));
    const startIso = toIso(bucketStart);
    const endIso = toIso(bucketEnd);
    const { projectIds, projectNames } = collect(startIso, endIso);
    const labels = formatBucketLabels(bucketStart, bucketEnd, safeGranularity, multiYear);

    trend.push({
      ...labels,
      startDate: startIso,
      endDate: endIso,
      count: projectIds.length,
      projectIds,
      projectNames,
    });

    cursor = nextBucket(startOfBucket(cursor, safeGranularity), safeGranularity);
  }

  const total = collect(toIso(rangeStart), toIso(rangeEnd)).projectIds.length;
  return { trend, totalScheduled: total };
}
