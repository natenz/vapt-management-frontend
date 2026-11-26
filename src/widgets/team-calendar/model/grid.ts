/**
 * Grid kalender tim. Semua tanggal berupa string YYYY-MM-DD dan dihitung sebagai nomor hari UTC,
 * jadi zona waktu browser tidak pernah menggeser hari.
 */
import type { CalendarBooking, CalendarLeave, CalendarPerson } from "@/entities/calendar";
import type { Holiday } from "@/entities/leave";

export type CalendarMode = "bulan" | "minggu";

const DAY = 86_400_000;
const toDayNo = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / DAY;
};
const fromDayNo = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

export const addDays = (iso: string, days: number) => fromDayNo(toDayNo(iso) + days);
/** 0 = Minggu … 6 = Sabtu. */
export const weekdayOf = (iso: string) => new Date(toDayNo(iso) * DAY).getUTCDay();
export const isWeekend = (iso: string) => weekdayOf(iso) === 0 || weekdayOf(iso) === 6;
export const mondayOf = (iso: string) => addDays(iso, -((weekdayOf(iso) + 6) % 7));

/** Tujuh tanggal Senin–Minggu dari minggu yang memuat `iso`. */
export function weekOf(iso: string): string[] {
  const start = mondayOf(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Minggu-minggu (Senin–Minggu) yang menutupi bulan `ym` ("YYYY-MM"). */
export function monthWeeks(ym: string): string[][] {
  const first = `${ym}-01`;
  const [y, m] = ym.split("-").map(Number);
  const last = fromDayNo(Date.UTC(y!, m!, 0) / DAY);
  const weeks: string[][] = [];
  for (let start = mondayOf(first); toDayNo(start) <= toDayNo(last); start = addDays(start, 7)) {
    weeks.push(weekOf(start));
  }
  return weeks;
}

/** Rentang yang diminta ke BE untuk tampilan saat ini. */
export function gridRange(mode: CalendarMode, anchor: string): { from: string; to: string } {
  const days = mode === "bulan" ? monthWeeks(anchor.slice(0, 7)).flat() : weekOf(anchor);
  return { from: days[0]!, to: days[days.length - 1]! };
}

/** Tanggal acuan periode sebelumnya (-1) atau berikutnya (+1). Bulan selalu jatuh di tanggal 1. */
export function shiftAnchor(mode: CalendarMode, anchor: string, step: -1 | 1): string {
  if (mode === "minggu") return addDays(anchor, step * 7);
  const [y, m] = anchor.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + step, 1));
  return d.toISOString().slice(0, 10);
}

const covers = (item: { start_date: string; end_date: string }, iso: string) =>
  item.start_date.slice(0, 10) <= iso && iso <= item.end_date.slice(0, 10);

export interface DayEntry {
  person: CalendarPerson;
  bookings: CalendarBooking[];
  leave?: CalendarLeave;
}

export interface DayInfo {
  iso: string;
  weekend: boolean;
  holiday?: Holiday;
  entries: DayEntry[];
  /** Pentester tanpa penugasan dan tanpa cuti disetujui di hari kerja ini. */
  available: number;
}

export function dayEntries(people: readonly CalendarPerson[], holidays: readonly Holiday[], iso: string): DayInfo {
  const weekend = isWeekend(iso);
  const holiday = holidays.find((h) => h.date.slice(0, 10) === iso);
  const entries = people.map((person) => ({
    person,
    bookings: person.bookings.filter((b) => covers(b, iso)),
    leave: person.leaves.find((l) => covers(l, iso)),
  }));
  const available =
    weekend || holiday
      ? 0
      : entries.filter((e) => e.bookings.length === 0 && e.leave?.status !== "approved").length;
  return { iso, weekend, ...(holiday ? { holiday } : {}), entries, available };
}
