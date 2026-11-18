import { format, isSameDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/** Rentang tanggal inklusif (tanggal kalender lokal). */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Label rentang berbahasa Indonesia yang ringkas:
 * - 17 Nov 2026
 * - 1 Jan – 31 Des 2026
 * - 1 Des 2025 – 31 Jan 2026
 */
export function formatDateRangeLabel(range: DateRange): string {
  const { start, end } = range;
  if (isSameDay(start, end)) return format(start, "d MMM yyyy", { locale: idLocale });
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "d MMM", { locale: idLocale })} – ${format(end, "d MMM yyyy", { locale: idLocale })}`;
  }
  return `${format(start, "d MMM yyyy", { locale: idLocale })} – ${format(end, "d MMM yyyy", { locale: idLocale })}`;
}

/**
 * Parse tanggal "YYYY-MM-DD" (boleh diikuti waktu) menjadi Date lokal tengah malam.
 * Hanya bagian tanggal kalender yang dipakai agar tidak bergeser karena zona waktu.
 */
export function parseDateOnly(value?: string | null): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}
