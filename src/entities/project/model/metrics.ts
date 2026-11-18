import {
  addMonths,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Project, ProjectStatus } from "./types";

export type Granularity = "day" | "week" | "month" | "year";
export type Timeframe = Granularity | "7d" | "30d" | "12m";

export interface MetricTrendPoint {
  label: string;
  count: number;
  dateStr: string;
  startDate: string;
  endDate: string;
  projectNames: string[];
  projectIds: number[];
}

export interface ScheduleRangeInfo {
  granularity: Granularity;
  startDate: string;
  endDate: string;
  displayTitle: string;
  subTitle: string;
}

export interface ProjectMetrics {
  range: ScheduleRangeInfo;
  trend: MetricTrendPoint[];
  summary: {
    totalScheduled: number;
    today: number;
    week: number;
    month: number;
    year: number;
    "7d"?: number;
    "30d"?: number;
    "12m"?: number;
  };
  trends: {
    day: MetricTrendPoint[];
    week: MetricTrendPoint[];
    month: MetricTrendPoint[];
    year: MetricTrendPoint[];
    "7d"?: MetricTrendPoint[];
    "30d"?: MetricTrendPoint[];
    "12m"?: MetricTrendPoint[];
  };
}

export interface CalculateProjectMetricsOptions {
  statuses?: ProjectStatus[];
  referenceDate?: Date;
  targetDate?: Date;
  granularity?: Granularity;
  year?: number;
  month?: number; // 0 - 11
  quarter?: number; // 1 - 4
  startYear?: number;
}

/**
 * Format label periode kontekstual sesuai spesifikasi Bahasa Indonesia:
 * - Hari: 17 November 2026
 * - Minggu: 16–22 November 2026
 * - Bulan: November 2026
 * - Tahun: Tahun 2026
 */
export function formatPeriodLabel(date: Date, granularity: Granularity): string {
  if (granularity === "day") {
    return format(date, "d MMMM yyyy", { locale: idLocale });
  }
  if (granularity === "week") {
    const s = startOfWeek(date, { weekStartsOn: 1 });
    const e = endOfWeek(date, { weekStartsOn: 1 });
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${format(s, "d")}–${format(e, "d MMMM yyyy", { locale: idLocale })}`;
    }
    if (s.getFullYear() === e.getFullYear()) {
      return `${format(s, "d MMMM", { locale: idLocale })} – ${format(e, "d MMMM yyyy", { locale: idLocale })}`;
    }
    return `${format(s, "d MMMM yyyy", { locale: idLocale })} – ${format(e, "d MMMM yyyy", { locale: idLocale })}`;
  }
  if (granularity === "month") {
    return format(date, "MMMM yyyy", { locale: idLocale });
  }
  return `Tahun ${date.getFullYear()}`;
}

/**
 * Normalisasi string tanggal menjadi format "YYYY-MM-DD".
 * Menghindari pergeseran zona waktu dengan hanya mengambil bagian tanggal kalender ISO.
 */
export function normalizeDateStr(dateStr?: string | null): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Validasi kelayakan proyek untuk perhitungan jadwal:
 * 1. Mengecualikan status "Draft" (tidak peduli huruf besar/kecil).
 * 2. Menyertakan seluruh status alur aktif dan status "Done" untuk representasi riwayat jadwal.
 * 3. Mengecualikan proyek tanpa start_date atau end_date.
 * 4. Mengecualikan rentang tanggal tidak valid (start_date > end_date).
 */
export function isProjectEligibleForSchedule(
  project: Project,
  statusMap?: Map<number, string>,
): { valid: boolean; startDate?: string; endDate?: string } {
  const statusName =
    project.status?.status_name ??
    (project.status_id && statusMap ? statusMap.get(project.status_id) : undefined) ??
    "";

  if (statusName.trim().toLowerCase() === "draft") {
    return { valid: false };
  }

  const startDate = normalizeDateStr(project.start_date);
  const endDate = normalizeDateStr(project.end_date);

  if (!startDate || !endDate || startDate > endDate) {
    return { valid: false };
  }

  return { valid: true, startDate, endDate };
}

/**
 * Memeriksa apakah rentang jadwal proyek bertumpukan (overlap) dengan suatu periode:
 * project.start_date <= period.end_date AND project.end_date >= period.start_date
 */
export function doesProjectOverlapPeriod(
  projectStart: string,
  projectEnd: string,
  periodStart: string,
  periodEnd: string,
): boolean {
  return projectStart <= periodEnd && projectEnd >= periodStart;
}

/**
 * Menghitung metrik jadwal proyek per periode waktu berdasarkan REST API.
 * Mendukung filter: hari, minggu, bulan, tahun dengan default tampilan per bulan dalam rentang currentyear.
 */
export function calculateProjectMetrics(
  projects: Project[],
  optionsOrRefDate?: Date | CalculateProjectMetricsOptions,
): ProjectMetrics {
  const isDateParam = optionsOrRefDate instanceof Date;
  const refDate = isDateParam
    ? optionsOrRefDate
    : optionsOrRefDate?.referenceDate ?? new Date();

  const statuses = !isDateParam ? optionsOrRefDate?.statuses : undefined;
  const granularity: Granularity = (!isDateParam && optionsOrRefDate?.granularity)
    ? optionsOrRefDate.granularity
    : "month"; // Default: per bulan

  const targetDate = (!isDateParam && optionsOrRefDate?.targetDate)
    ? optionsOrRefDate.targetDate
    : refDate;

  const statusMap = statuses
    ? new Map<number, string>(statuses.map((s) => [s.status_process_id, s.status_name]))
    : undefined;

  // Filter proyek yang memenuhi syarat
  const eligibleProjects = projects
    .map((p) => {
      const eligibility = isProjectEligibleForSchedule(p, statusMap);
      if (!eligibility.valid || !eligibility.startDate || !eligibility.endDate) {
        return null;
      }
      return {
        project: p,
        startDate: eligibility.startDate,
        endDate: eligibility.endDate,
      };
    })
    .filter(
      (item): item is { project: Project; startDate: string; endDate: string } =>
        item !== null,
    );

  const selectedYear = (!isDateParam && optionsOrRefDate?.year !== undefined)
    ? optionsOrRefDate.year
    : targetDate.getFullYear();

  const selectedMonth = (!isDateParam && optionsOrRefDate?.month !== undefined)
    ? optionsOrRefDate.month
    : targetDate.getMonth();

  const selectedQuarter = (!isDateParam && optionsOrRefDate?.quarter !== undefined)
    ? optionsOrRefDate.quarter
    : Math.floor(targetDate.getMonth() / 3) + 1;

  const selectedStartYear = (!isDateParam && optionsOrRefDate?.startYear !== undefined)
    ? optionsOrRefDate.startYear
    : selectedYear - 4;

  // Helper untuk menghitung jumlah proyek unik yang bertumpukan dengan rentang periode
  const countUniqueProjectsInInterval = (intervalStart: string, intervalEnd: string) => {
    const matched = eligibleProjects.filter((p) =>
      doesProjectOverlapPeriod(p.startDate, p.endDate, intervalStart, intervalEnd),
    );
    const uniqueIds = new Set(matched.map((m) => m.project.project_id));
    return uniqueIds.size;
  };

  // Helper untuk membuat bucket data tren
  const buildTrendPoint = (
    label: string,
    dateStr: string,
    bucketStart: string,
    bucketEnd: string,
  ): MetricTrendPoint => {
    const matched = eligibleProjects.filter((p) =>
      doesProjectOverlapPeriod(p.startDate, p.endDate, bucketStart, bucketEnd),
    );

    const projectNames: string[] = [];
    const projectIds: number[] = [];
    const seenIds = new Set<number>();

    for (const item of matched) {
      if (!seenIds.has(item.project.project_id)) {
        seenIds.add(item.project.project_id);
        projectIds.push(item.project.project_id);
        projectNames.push(item.project.project_name);
      }
    }

    return {
      label,
      dateStr,
      startDate: bucketStart,
      endDate: bucketEnd,
      count: projectIds.length,
      projectNames,
      projectIds,
    };
  };

  // 1. Pembuatan tren per Bulan (12 bulan dalam rentang tahun yang dipilih)
  const monthDateBase = new Date(selectedYear, 0, 1);
  const monthTrend: MetricTrendPoint[] = [];

  for (let i = 0; i < 12; i++) {
    const m = addMonths(monthDateBase, i);
    const startM = format(startOfMonth(m), "yyyy-MM-dd");
    const endM = format(endOfMonth(m), "yyyy-MM-dd");
    monthTrend.push(
      buildTrendPoint(
        format(m, "MMM", { locale: idLocale }),
        format(m, "MMMM yyyy", { locale: idLocale }),
        startM,
        endM,
      ),
    );
  }

  // 2. Pembuatan tren per Hari (seluruh hari dalam bulan & tahun yang dipilih)
  const dayDateBase = new Date(selectedYear, selectedMonth, 1);
  const totalDaysInMonth = endOfMonth(dayDateBase).getDate();
  const dayTrend: MetricTrendPoint[] = [];

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(selectedYear, selectedMonth, day);
    const dayStr = format(d, "yyyy-MM-dd");
    dayTrend.push(
      buildTrendPoint(
        format(d, "dd MMM", { locale: idLocale }),
        format(d, "dd MMMM yyyy", { locale: idLocale }),
        dayStr,
        dayStr,
      ),
    );
  }

  // 3. Pembuatan tren per Minggu (berdasarkan kuartal terpilih dalam tahun yang dipilih)
  const quarterStartMonth = (selectedQuarter - 1) * 3;
  const quarterStartDate = new Date(selectedYear, quarterStartMonth, 1);
  const quarterEndDate = endOfMonth(new Date(selectedYear, quarterStartMonth + 2, 1));
  const weekTrend: MetricTrendPoint[] = [];

  let currentWeekCursor = startOfWeek(quarterStartDate, { weekStartsOn: 1 });
  let weekIndex = 1;
  while (currentWeekCursor <= quarterEndDate) {
    const wStart = currentWeekCursor;
    const wEnd = endOfWeek(currentWeekCursor, { weekStartsOn: 1 });
    const startWStr = format(wStart, "yyyy-MM-dd");
    const endWStr = format(wEnd, "yyyy-MM-dd");

    weekTrend.push(
      buildTrendPoint(
        `Mgg ${weekIndex}`,
        `${format(wStart, "dd MMM", { locale: idLocale })} - ${format(wEnd, "dd MMM yyyy", { locale: idLocale })}`,
        startWStr,
        endWStr,
      ),
    );

    currentWeekCursor = subDays(currentWeekCursor, -7);
    weekIndex++;
  }

  // 4. Pembuatan tren per Tahun (rentang 5 tahun)
  const yearTrend: MetricTrendPoint[] = [];

  for (let y = selectedStartYear; y <= selectedStartYear + 4; y++) {
    const startYStr = `${y}-01-01`;
    const endYStr = `${y}-12-31`;
    yearTrend.push(
      buildTrendPoint(
        String(y),
        `Tahun ${y}`,
        startYStr,
        endYStr,
      ),
    );
  }

  // Tentukan tren dan informasi rentang aktif berdasarkan granularitas & targetDate
  let activeTrend: MetricTrendPoint[] = monthTrend;
  let activeRange: ScheduleRangeInfo = {
    granularity: "month",
    startDate: format(startOfMonth(targetDate), "yyyy-MM-dd"),
    endDate: format(endOfMonth(targetDate), "yyyy-MM-dd"),
    displayTitle: formatPeriodLabel(targetDate, "month"),
    subTitle: `Januari - Desember ${selectedYear}`,
  };

  if (granularity === "day") {
    activeTrend = dayTrend;
    const dayStr = format(targetDate, "yyyy-MM-dd");
    activeRange = {
      granularity: "day",
      startDate: dayStr,
      endDate: dayStr,
      displayTitle: formatPeriodLabel(targetDate, "day"),
      subTitle: `${totalDaysInMonth} hari`,
    };
  } else if (granularity === "week") {
    activeTrend = weekTrend;
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    activeRange = {
      granularity: "week",
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(weekEnd, "yyyy-MM-dd"),
      displayTitle: formatPeriodLabel(targetDate, "week"),
      subTitle: `${format(quarterStartDate, "MMM", { locale: idLocale })} - ${format(quarterEndDate, "MMM yyyy", { locale: idLocale })}`,
    };
  } else if (granularity === "year") {
    activeTrend = yearTrend;
    const yearStart = `${targetDate.getFullYear()}-01-01`;
    const yearEnd = `${targetDate.getFullYear()}-12-31`;
    activeRange = {
      granularity: "year",
      startDate: yearStart,
      endDate: yearEnd,
      displayTitle: formatPeriodLabel(targetDate, "year"),
      subTitle: `${selectedStartYear} - ${selectedStartYear + 4}`,
    };
  }

  // Hitung total proyek terjadwal unik untuk periode yang sedang aktif
  const totalScheduledInActiveRange = countUniqueProjectsInInterval(
    activeRange.startDate,
    activeRange.endDate,
  );

  // Nilai ringkasan legacy
  const todayStr = format(refDate, "yyyy-MM-dd");
  const todayKPI = countUniqueProjectsInInterval(todayStr, todayStr);
  const week7DaysStartStr = format(subDays(refDate, 6), "yyyy-MM-dd");
  const weekKPI = countUniqueProjectsInInterval(week7DaysStartStr, todayStr);
  const month30DaysStartStr = format(subDays(refDate, 29), "yyyy-MM-dd");
  const monthKPI = countUniqueProjectsInInterval(month30DaysStartStr, todayStr);
  const yearCurrentStartStr = format(startOfYear(refDate), "yyyy-MM-dd");
  const yearCurrentEndStr = format(endOfYear(refDate), "yyyy-MM-dd");
  const yearKPI = countUniqueProjectsInInterval(yearCurrentStartStr, yearCurrentEndStr);

  return {
    range: activeRange,
    trend: activeTrend,
    summary: {
      totalScheduled: totalScheduledInActiveRange,
      today: todayKPI,
      week: weekKPI,
      month: monthKPI,
      year: yearKPI,
      "7d": weekKPI,
      "30d": monthKPI,
      "12m": yearKPI,
    },
    trends: {
      day: dayTrend,
      week: weekTrend,
      month: monthTrend,
      year: yearTrend,
      "7d": dayTrend.slice(0, 7),
      "30d": dayTrend.slice(0, 30),
      "12m": monthTrend,
    },
  };
}
