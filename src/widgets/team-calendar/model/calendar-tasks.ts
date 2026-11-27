/**
 * Baris Gantt kalender tim: satu baris per pentester, penugasannya sebagai baris anak.
 * Task hanya membawa nilai primitif dan Date agar aman untuk state internal SVAR.
 */
import { endOfMonth, format, startOfDay, startOfMonth } from "date-fns";
import { warningShort, type TeamCalendar } from "@/entities/calendar";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { parseDateOnly, type DateRange } from "@/shared/lib/date-range";
import { exclusiveEnd } from "@/shared/ui/svar-gantt";

export interface CalendarTask {
  id: string;
  text: string;
  start: Date;
  /** Batas kanan eksklusif (konvensi SVAR). */
  end: Date;
  type: "task";
  parent?: string;
  open?: boolean;
  kind: "person" | "booking";
  // Baris pentester
  name?: string;
  initials?: string;
  workdays?: number;
  bookingCount?: number;
  // Baris penugasan
  projectId?: number;
  projectName?: string;
  assetName?: string;
  /** Tanggal asli penugasan (YYYY-MM-DD), tidak terpotong rentang tampilan. */
  startDate?: string;
  endDate?: string;
  allocatedMandays?: number;
  masked?: boolean;
  /** Ringkasan peringatan bentrok; kosong bila tidak ada. */
  warning?: string;
}

const MASKED_LABEL = "Proyek lain";

/** Tampilan awal: bulan berjalan per hari, seperti membuka kalender. */
export function currentMonthSchedule(today: Date = new Date()): ScheduleRangeValue {
  return { granularity: "day", range: { start: startOfMonth(today), end: startOfDay(endOfMonth(today)) } };
}

export const toIsoDate = (date: Date) => format(date, "yyyy-MM-dd");

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";

export function buildCalendarTasks(
  data: TeamCalendar | undefined,
  range: DateRange,
  collapsed: ReadonlySet<string> = new Set(),
): CalendarTask[] {
  const rangeStart = startOfDay(range.start);
  const rangeEnd = exclusiveEnd(startOfDay(range.end));
  const rows: CalendarTask[] = [];

  for (const person of data?.people ?? []) {
    const parent = `user:${person.sys_user_id}`;
    const bookings = person.bookings.flatMap<CalendarTask>((b) => {
      const start = parseDateOnly(b.start_date);
      const last = parseDateOnly(b.end_date);
      if (!start || !last || last < start || last < rangeStart || start >= rangeEnd) return [];
      const end = exclusiveEnd(last);
      return [
        {
          id: `booking:${b.mandays_id}`,
          parent,
          kind: "booking",
          type: "task",
          text: b.masked ? MASKED_LABEL : [b.project_name, b.asset_name].filter(Boolean).join(" · "),
          start: start < rangeStart ? rangeStart : start,
          end: end > rangeEnd ? rangeEnd : end,
          startDate: b.start_date.slice(0, 10),
          endDate: b.end_date.slice(0, 10),
          allocatedMandays: b.allocated_mandays,
          masked: b.masked,
          ...(b.masked ? {} : { projectId: b.project_id, projectName: b.project_name, assetName: b.asset_name }),
          warning: b.warnings.map(warningShort).join(", "),
        },
      ];
    });

    rows.push({
      id: parent,
      kind: "person",
      type: "task",
      open: !collapsed.has(parent),
      text: person.name,
      name: person.name,
      initials: getInitials(person.name),
      workdays: person.workdays,
      bookingCount: bookings.length,
      // Sepanjang rentang, agar label nama di layar sempit bisa menempel saat chart digeser.
      start: rangeStart,
      end: rangeEnd,
    });
    rows.push(...bookings);
  }

  return rows;
}
