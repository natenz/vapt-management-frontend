import type { Project } from "@/entities/project";
import { PROJECT_STATUSES } from "@/shared/api/schemas";

/** Kondisi jadwal proyek relatif terhadap hari ini. */
export type ScheduleFilter = "all" | "ongoing" | "upcoming" | "past" | "unscheduled";

export interface ProjectFilters {
  search: string;
  statuses: string[];
  clients: string[];
  schedule: ScheduleFilter;
}

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
  search: "",
  statuses: [],
  clients: [],
  schedule: "all",
};

/** Pilihan jumlah baris per halaman tabel proyek. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

export const SCHEDULE_OPTIONS: { value: ScheduleFilter; label: string }[] = [
  { value: "all", label: "Semua jadwal" },
  { value: "ongoing", label: "Sedang berjalan" },
  { value: "upcoming", label: "Akan datang" },
  { value: "past", label: "Sudah berakhir" },
  { value: "unscheduled", label: "Belum dijadwalkan" },
];

const SCHEDULE_VALUES = new Set<string>(SCHEDULE_OPTIONS.map((o) => o.value));

/* ---------- Sinkronisasi URL ---------- */

const PARAM = { search: "q", statuses: "status", clients: "klien", schedule: "jadwal" } as const;
const PAGE_SIZE_PARAM = "per";

export function parsePageSize(params: URLSearchParams): number {
  const value = Number(params.get(PAGE_SIZE_PARAM));
  return PAGE_SIZE_OPTIONS.includes(value) ? value : DEFAULT_PAGE_SIZE;
}

export function writePageSize(pageSize: number, base: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(base);
  if (pageSize === DEFAULT_PAGE_SIZE) next.delete(PAGE_SIZE_PARAM);
  else next.set(PAGE_SIZE_PARAM, String(pageSize));
  return next;
}

const splitList = (raw: string | null) =>
  raw
    ? raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

export function parseProjectFilters(params: URLSearchParams): ProjectFilters {
  const schedule = params.get(PARAM.schedule) ?? "all";
  return {
    search: params.get(PARAM.search) ?? "",
    statuses: splitList(params.get(PARAM.statuses)),
    clients: splitList(params.get(PARAM.clients)),
    schedule: SCHEDULE_VALUES.has(schedule) ? (schedule as ScheduleFilter) : "all",
  };
}

/**
 * Tulis filter ke query string. Parameter lain di URL dipertahankan;
 * nilai default dihapus supaya URL tetap bersih.
 */
export function writeProjectFilters(
  filters: ProjectFilters,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set(PARAM.search, filters.search.trim());
  set(PARAM.statuses, filters.statuses.join(","));
  set(PARAM.clients, filters.clients.join(","));
  set(PARAM.schedule, filters.schedule === "all" ? "" : filters.schedule);
  return next;
}

/** Jumlah filter faset yang aktif (pencarian tidak dihitung). */
export function countActiveFilters(filters: ProjectFilters): number {
  return (
    (filters.statuses.length > 0 ? 1 : 0) +
    (filters.clients.length > 0 ? 1 : 0) +
    (filters.schedule !== "all" ? 1 : 0)
  );
}

export function hasAnyFilter(filters: ProjectFilters): boolean {
  return countActiveFilters(filters) > 0 || filters.search.trim() !== "";
}

/* ---------- Pencocokan ---------- */

const dateOnly = (value?: string | null) => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Kondisi jadwal proyek:
 * - Sudah berakhir: hanya proyek berstatus Done.
 * - Belum dijadwalkan: belum Done dan tanggal mulai/selesai belum lengkap.
 * - Akan datang: belum Done dan tanggal mulai masih di depan.
 * - Sedang berjalan: selain itu, termasuk proyek yang melewati tanggal
 *   selesai tetapi belum Done (masih harus dituntaskan).
 */
export function getScheduleState(
  project: Pick<Project, "start_date" | "end_date" | "status">,
  today: Date = new Date(),
): Exclude<ScheduleFilter, "all"> {
  if (project.status?.status_name?.trim().toLowerCase() === "done") return "past";

  const start = dateOnly(project.start_date);
  const end = dateOnly(project.end_date);
  if (!start || !end) return "unscheduled";

  if (toIsoDate(today) < start) return "upcoming";
  return "ongoing";
}

const statusOf = (p: Project) => p.status?.status_name ?? "";
const clientOf = (p: Project) => p.client_name?.trim() ?? "";

/** Pencarian tidak peka huruf besar/kecil pada nama proyek dan klien. */
export function matchesSearch(project: Project, search: string): boolean {
  const query = search.trim().toLocaleLowerCase("id");
  if (!query) return true;
  return (
    project.project_name.toLocaleLowerCase("id").includes(query) ||
    clientOf(project).toLocaleLowerCase("id").includes(query)
  );
}

/** Terapkan pencarian dan filter faset (status, klien, jadwal). */
export function applyProjectFilters(
  projects: Project[],
  filters: ProjectFilters,
  today: Date = new Date(),
): Project[] {
  const statuses = new Set(filters.statuses);
  const clients = new Set(filters.clients);

  return projects.filter(
    (p) =>
      matchesSearch(p, filters.search) &&
      (statuses.size === 0 || statuses.has(statusOf(p))) &&
      (clients.size === 0 || clients.has(clientOf(p))) &&
      (filters.schedule === "all" || getScheduleState(p, today) === filters.schedule),
  );
}

/* ---------- Opsi faset ---------- */

export interface FacetOption {
  value: string;
  count: number;
}

/** Opsi status mengikuti urutan alur proyek, lalu status lain yang tak dikenal. */
export function getStatusOptions(projects: Project[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const p of projects) {
    const s = statusOf(p);
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }

  const known: string[] = [...PROJECT_STATUSES];
  const unknown = [...counts.keys()].filter((s) => !known.includes(s)).sort();
  return [...known, ...unknown].map((value) => ({ value, count: counts.get(value) ?? 0 }));
}

/** Opsi klien diurutkan alfabetis, hanya klien yang muncul di data. */
export function getClientOptions(projects: Project[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const p of projects) {
    const c = clientOf(p);
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "id"))
    .map(([value, count]) => ({ value, count }));
}
