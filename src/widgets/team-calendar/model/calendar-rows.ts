/**
 * Baris Gantt kalender tim: satu baris per proyek. Batang mengikuti hari yang ada penugasannya;
 * pentesternya baru ditampilkan saat batang disorot.
 */
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isWeekend,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { warningShort, type CalendarBooking, type TeamCalendar } from "@/entities/calendar";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { parseDateOnly, type DateRange } from "@/shared/lib/date-range";

export interface CalendarFilters {
  /** 0 = semua. */
  personId: number;
  projectId: number;
}

export interface CalendarEntry {
  mandaysId: number;
  person: string;
  asset: string;
  /** Tanggal asli penugasan (YYYY-MM-DD), tidak terpotong rentang tampilan. */
  startDate: string;
  endDate: string;
  allocatedMandays: number;
  /** Ringkasan peringatan bentrok; kosong bila tidak ada. */
  warning: string;
}

export interface CalendarSegment {
  startsAt: string;
  endsAt: string;
  /** Posisi dan lebar dalam persen rentang tampilan. */
  left: number;
  width: number;
  conflict: boolean;
}

export interface CalendarRow {
  id: string;
  name: string;
  /** Kosong untuk proyek PM lain (disamarkan BE). */
  projectId?: number;
  masked: boolean;
  entries: CalendarEntry[];
  segments: CalendarSegment[];
}

const MASKED_LABEL = "Proyek lain";

/** Tampilan awal: bulan berjalan per hari, seperti membuka kalender. */
export function currentMonthSchedule(today: Date = new Date()): ScheduleRangeValue {
  return { granularity: "day", range: { start: startOfMonth(today), end: startOfDay(endOfMonth(today)) } };
}

export const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd");

interface Booked {
  booking: CalendarBooking;
  start: Date;
  end: Date;
}

/** Proyek yang disamarkan tidak punya id, jadi tiap penugasannya dianggap proyek tersendiri. */
const projectKey = (b: CalendarBooking) => (b.masked ? `masked:${b.mandays_id}` : `project:${b.project_id}`);

interface Draft extends Omit<CalendarRow, "segments"> {
  /** Indeks hari dalam rentang tampilan. */
  assigned: Set<number>;
  clashing: Set<number>;
}

export function buildProjectRows(
  data: TeamCalendar | undefined,
  range: DateRange,
  { splitDays, filters }: { splitDays: boolean; filters?: CalendarFilters },
): CalendarRow[] {
  const first = startOfDay(range.start);
  const total = differenceInCalendarDays(startOfDay(range.end), first) + 1;
  const holidays = new Set((data?.holidays ?? []).map((h) => h.date.slice(0, 10)));
  const isOff = (day: Date) => isWeekend(day) || holidays.has(toIsoDate(day));
  const dayAt = (index: number) => addDays(first, index);
  const drafts = new Map<string, Draft>();

  for (const person of data?.people ?? []) {
    // Bentrok dihitung dari seluruh jadwal orang itu, sebelum filter diterapkan.
    const booked = person.bookings.flatMap<Booked>((booking) => {
      const start = parseDateOnly(booking.start_date);
      const end = parseDateOnly(booking.end_date);
      return start && end && end >= start ? [{ booking, start, end }] : [];
    });
    if (filters?.personId && person.sys_user_id !== filters.personId) continue;

    for (const { booking, start, end } of booked) {
      if (filters?.projectId && booking.project_id !== filters.projectId) continue;
      const from = Math.max(0, differenceInCalendarDays(start, first));
      const to = Math.min(total - 1, differenceInCalendarDays(end, first));
      if (from > to) continue;

      const clashDays = new Set<number>();
      const clashNames = new Set<string>();
      if (booking.warnings.includes("other_project")) {
        for (const other of booked) {
          if (projectKey(other.booking) === projectKey(booking)) continue;
          // Seperti aturan BE: hanya hari kerja yang dihitung bentrok.
          for (let day = start > other.start ? start : other.start; day <= end && day <= other.end; day = addDays(day, 1)) {
            if (isOff(day)) continue;
            clashNames.add(other.booking.masked ? "proyek lain" : other.booking.project_name);
            clashDays.add(differenceInCalendarDays(day, first));
          }
        }
      }

      const warning = booking.warnings
        .map((code) =>
          code === "other_project"
            ? `Bentrok dengan ${[...clashNames].join(", ") || "proyek lain"}`
            : warningShort(code),
        )
        .join(", ");
      const wholeBooking = booking.warnings.includes("exceeds_workdays");

      const id = booking.masked ? "project:masked" : `project:${booking.project_id}`;
      const draft: Draft = drafts.get(id) ?? {
        id,
        name: booking.masked ? MASKED_LABEL : booking.project_name,
        ...(booking.masked ? {} : { projectId: booking.project_id }),
        masked: booking.masked,
        entries: [],
        assigned: new Set(),
        clashing: new Set(),
      };
      for (let index = from; index <= to; index++) {
        draft.assigned.add(index);
        if (wholeBooking || clashDays.has(index)) draft.clashing.add(index);
      }
      draft.entries.push({
        mandaysId: booking.mandays_id,
        person: person.name,
        asset: booking.asset_name,
        startDate: booking.start_date.slice(0, 10),
        endDate: booking.end_date.slice(0, 10),
        allocatedMandays: booking.allocated_mandays,
        warning,
      });
      drafts.set(id, draft);
    }
  }

  /** Hari berurutan dengan status sama digabung jadi satu potongan batang. */
  const toSegments = ({ assigned, clashing }: Draft, skipOff: boolean) => {
    const segments: CalendarSegment[] = [];
    let open: { from: number; conflict: boolean } | null = null;
    for (let index = 0; index <= total; index++) {
      const drawn = assigned.has(index) && !(skipOff && isOff(dayAt(index)));
      const conflict = clashing.has(index);
      if (open && (!drawn || conflict !== open.conflict)) {
        segments.push({
          startsAt: toIsoDate(dayAt(open.from)),
          endsAt: toIsoDate(dayAt(index - 1)),
          left: (open.from / total) * 100,
          width: ((index - open.from) / total) * 100,
          conflict: open.conflict,
        });
        open = null;
      }
      if (drawn && !open) open = { from: index, conflict };
    }
    return segments;
  };

  const firstDay = (draft: Draft) => Math.min(...draft.assigned);

  return [...drafts.values()]
    .sort(
      (a, b) =>
        Number(a.masked) - Number(b.masked) || firstDay(a) - firstDay(b) || a.name.localeCompare(b.name),
    )
    .map((draft) => {
      const working = toSegments(draft, splitDays);
      const { assigned: _assigned, clashing: _clashing, entries, ...row } = draft;
      return {
        ...row,
        entries: [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.person.localeCompare(b.person)),
        // Penugasan yang seluruhnya jatuh di hari nonkerja tetap digambar.
        segments: working.length > 0 ? working : toSegments(draft, false),
      };
    });
}
