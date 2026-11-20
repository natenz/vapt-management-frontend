import { addDays, differenceInCalendarDays, format, isWeekend, startOfDay } from "date-fns";

/** Potongan hari kerja dalam rentang tanggal inklusif. Posisi mengikuti kalender, termasuk celah libur. */
export function workingSegments(start: Date, end: Date, holidays: readonly string[] = [], skipWeekends = true) {
  const first = startOfDay(start);
  const last = startOfDay(end);
  const total = differenceInCalendarDays(last, first) + 1;
  if (!Number.isFinite(total) || total <= 0) return [];
  const excluded = new Set(holidays);
  const segments: { startsAt: string; endsAt: string; left: number; width: number; days: number }[] = [];
  let open = -1;
  for (let offset = 0; offset <= total; offset++) {
    const day = addDays(first, offset);
    const working = offset < total && !(skipWeekends && isWeekend(day)) && !excluded.has(format(day, "yyyy-MM-dd"));
    if (working && open < 0) open = offset;
    if (!working && open >= 0) {
      segments.push({
        startsAt: format(addDays(first, open), "yyyy-MM-dd"),
        endsAt: format(addDays(first, offset - 1), "yyyy-MM-dd"),
        left: (open / total) * 100,
        width: ((offset - open) / total) * 100,
        days: offset - open,
      });
      open = -1;
    }
  }
  return segments;
}
