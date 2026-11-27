import { fmtDate } from "@/shared/lib/format";
import type { ScheduleWarning } from "@/shared/api/schemas";

const SHORT: Record<string, string> = {
  other_project: "Proyek lain",
  exceeds_workdays: "MD > hari kerja",
};

/** Label pendek untuk badge peringatan di kalender dan daftar asset. */
export const warningShort = (code: string) => SHORT[code] ?? code;

/** Kalimat peringatan bentrok untuk form dan dialog detail. */
export function warningText(w: Pick<ScheduleWarning, "code" | "dates" | "project_name" | "message">): string {
  const dates = (w.dates ?? []).map(fmtDate).join(", ");
  switch (w.code) {
    case "other_project":
      return `Bentrok dengan ${w.project_name || "proyek lain"} pada ${dates}`;
    default:
      return w.message ?? warningShort(w.code);
  }
}
