const clock = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
const dayMonth = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

/** Waktu di feed aktivitas: "Hari ini, 09.12", "Kemarin, 14.30", "28 Sep", "28 Sep 2025". */
export function formatActivityTime(value: string, now: Date = new Date()) {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return value;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (at.toDateString() === now.toDateString()) return `Hari ini, ${clock.format(at)}`;
  if (at.toDateString() === yesterday.toDateString()) return `Kemarin, ${clock.format(at)}`;
  return at.getFullYear() === now.getFullYear() ? dayMonth.format(at) : fullDate.format(at);
}

/** Lama sejak suatu waktu dalam hari: "hari ini", "1 hari", "4 hari". */
export function formatDaysSince(days: number) {
  return days <= 0 ? "hari ini" : `${days} hari`;
}
