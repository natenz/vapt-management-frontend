import { PROJECT_STATUSES } from "@/shared/api/schemas";

// 8 tahap timeline VAPT = status ke-3 s/d ke-10 (Scoping..Final Presentation), sama dengan trx_project_stages.
export const TIMELINE_STAGES = PROJECT_STATUSES.slice(2, 10);

/** Indeks tahap timeline untuk status proyek. Draft/Planning = -1 (belum kickoff), Done = 8 (semua selesai). */
export function stageIndexForStatus(status: string): number {
  if (status === "Done") return TIMELINE_STAGES.length;
  return TIMELINE_STAGES.indexOf(status as (typeof TIMELINE_STAGES)[number]);
}

/** Status ada di antara `from` dan `to` (inklusif) menurut urutan alur kerja. */
export function statusBetween(status: string | null | undefined, from: string, to: string): boolean {
  const all: readonly string[] = PROJECT_STATUSES;
  const i = all.indexOf(status ?? "");
  return i >= 0 && i >= all.indexOf(from) && i <= all.indexOf(to);
}
