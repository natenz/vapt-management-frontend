import {
  addDays,
  format,
  getISOWeek,
  isSameDay,
  isSameISOWeek,
  isSameMonth,
  isSameYear,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
/** Interval skala; identik dengan `Granularity` di entities/project (shared tidak boleh mengimpor entities). */
export type Granularity = "day" | "week" | "month" | "year";

/** Kelas CSS penanda periode hari ini (MIT `highlightTime`, pengganti marker PRO). */
export const TODAY_CELL_CLASS = "vapt-gantt-today";

export interface TimelineScaleConfig {
  scales: {
    unit: string;
    step: number;
    format: (date: Date) => string;
    css?: (date: Date) => string;
  }[];
  cellWidth: number;
}

const fmt = (pattern: string) => (date: Date) => format(date, pattern, { locale: idLocale });

/** Sama periode dengan hari ini untuk unit skala tertentu. */
export function isCurrentPeriod(date: Date, unit: string, today: Date = new Date()): boolean {
  switch (unit) {
    case "day":
      return isSameDay(date, today);
    case "week":
      return isSameISOWeek(date, today);
    case "month":
      return isSameMonth(date, today);
    case "year":
      return isSameYear(date, today);
    default:
      return false;
  }
}

const todayCss = (unit: string) => (date: Date) =>
  isCurrentPeriod(date, unit) ? TODAY_CELL_CLASS : "";

/**
 * Pemetaan interval Hari/Minggu/Bulan/Tahun (sama dengan Overview) ke skala
 * kalender SVAR: baris atas sebagai konteks, baris bawah sebagai sel snapshot.
 */
export function getTimelineScales(granularity: Granularity): TimelineScaleConfig {
  switch (granularity) {
    case "day":
      return {
        cellWidth: 36,
        scales: [
          { unit: "month", step: 1, format: fmt("MMMM yyyy") },
          { unit: "day", step: 1, format: fmt("d"), css: todayCss("day") },
        ],
      };
    case "week":
      return {
        cellWidth: 64,
        scales: [
          { unit: "month", step: 1, format: fmt("MMMM yyyy") },
          {
            unit: "week",
            step: 1,
            format: (date) => `M${getISOWeek(date)}`,
            css: todayCss("week"),
          },
        ],
      };
    case "year":
      return {
        cellWidth: 240,
        scales: [{ unit: "year", step: 1, format: fmt("yyyy"), css: todayCss("year") }],
      };
    case "month":
    default:
      return {
        cellWidth: 96,
        scales: [
          { unit: "year", step: 1, format: fmt("yyyy") },
          { unit: "month", step: 1, format: fmt("MMM"), css: todayCss("month") },
        ],
      };
  }
}

/** Batas kanan skala SVAR bersifat eksklusif. */
export const exclusiveEnd = (end: Date) => addDays(end, 1);
