import type { GanttState } from "@/shared/ui/gantt";

// Tahap pengujian (kerja yang dijadwalkan di trx_mandays) sudah lewat begitu proyek keluar dari Pentest.
const PENTEST_FINISHED = ["Reporting", "Remediation", "Retest", "Done"];

/**
 * Warna batang Gantt. BE tidak pernah mengubah trx_mandays.status (semua tetap "planned", termasuk di
 * proyek Done), jadi status proyek jadi sumber kebenaran: selesai tahap Pentest => batang "done".
 * ponytail: tidak ada status per-penugasan selama Pentest selain dari mandays.status/tanggal mulai.
 */
export function mandaysState(m: { status?: string | null; start_date?: string | null }, projectStatus: string, today = new Date()): GanttState {
  if (m.status === "done" || PENTEST_FINISHED.includes(projectStatus)) return "done";
  if (m.status === "in_progress") return "current";
  if (projectStatus === "Pentest" && m.start_date && new Date(m.start_date) <= today) return "current";
  return "todo";
}
