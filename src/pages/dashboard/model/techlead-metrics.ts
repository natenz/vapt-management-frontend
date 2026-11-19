/**
 * Agregasi dashboard Tech Lead: progres proyek berjalan dan MD terjadwal
 * pentester per minggu.
 *
 * Beban dihitung dari penugasan trx_mandays (detail proyek): allocated_mandays
 * dibagi rata per hari kalender start..end, sama seperti `mandaysInMonth`, lalu
 * diambil porsi yang jatuh di rentang yang ditanya.
 */
import type { CatalogVulna } from "@/entities/catalog";
import type { Mandays, Project, ProjectDetail } from "@/entities/project";
import type { User } from "@/entities/user";
import { PROJECT_STATUSES, SEVERITIES } from "@/shared/api/schemas";

/* ---------- Tanggal sebagai nomor hari UTC (bebas zona waktu) ---------- */

const MS_DAY = 86_400_000;
export const toDayNo = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / MS_DAY;
};
export const fromDayNo = (n: number) => new Date(n * MS_DAY).toISOString().slice(0, 10);
export const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
/** 0 = Minggu … 6 = Sabtu. 1 Jan 1970 adalah Kamis. */
const weekday = (n: number) => (((n + 4) % 7) + 7) % 7;
export const addDaysIso = (iso: string, days: number) => fromDayNo(toDayNo(iso) + days);

/** Senin pada minggu tanggal ini. */
export const mondayOf = (iso: string) => {
  const n = toDayNo(iso);
  return fromDayNo(n - ((weekday(n) + 6) % 7));
};

export function workingDays(start: string, end: string): number {
  let count = 0;
  for (let n = toDayNo(start), e = toDayNo(end); n <= e; n++) {
    const w = weekday(n);
    if (w !== 0 && w !== 6) count++;
  }
  return count;
}

/** Porsi MD sebuah penugasan yang jatuh di rentang start..end (inklusif). */
export function bookedInRange(
  m: Pick<Mandays, "start_date" | "end_date" | "allocated_mandays">,
  start: string,
  end: string,
): number {
  if (!m.start_date || !m.end_date) return 0;
  const s = toDayNo(m.start_date);
  const e = Math.max(s, toDayNo(m.end_date));
  const overlap = Math.min(e, toDayNo(end)) - Math.max(s, toDayNo(start)) + 1;
  return overlap > 0 ? (m.allocated_mandays * overlap) / (e - s + 1) : 0;
}

/* ---------- Penugasan pentester ---------- */

// Belum ada aturan resmi batas beban per orang (BE tidak menegakkannya), jadi di sini hanya
// fakta: berapa MD yang terjadwal. Tidak ada level "longgar/padat/penuh" atau rekomendasi slot.

const round1 = (n: number) => Math.round(n * 10) / 10;

export const pentestersOf = (users: readonly User[]) =>
  users.filter((u) => u.role?.role_name === "pentester");

export interface HeatmapWeek {
  start: string;
  end: string;
}

export interface HeatmapRow {
  user: User;
  /** MD terjadwal per minggu kerja (Senin–Jumat). */
  cells: { booked: number }[];
}

/** MD terjadwal tiap pentester per minggu kerja, `weeks` minggu mulai minggu ini. */
export function weeklyHeatmap(
  pentesters: readonly User[],
  details: readonly ProjectDetail[],
  weeks = 8,
  today = todayIso(),
): { weeks: HeatmapWeek[]; rows: HeatmapRow[] } {
  const first = mondayOf(today);
  const cols = Array.from({ length: weeks }, (_, i) => {
    const start = addDaysIso(first, i * 7);
    return { start, end: addDaysIso(start, 4) };
  });
  const rows = pentesters.map((user) => ({
    user,
    cells: cols.map((w) => {
      let booked = 0;
      for (const p of details)
        for (const m of p.mandays)
          if (m.pentester_id === user.sys_user_id) booked += bookedInRange(m, w.start, w.end);
      return { booked: round1(booked) };
    }),
  }));
  return { weeks: cols, rows };
}

/* ---------- Proyek berjalan ---------- */

const DONE = "Done";

export function stageProgress(status?: string | null): number {
  const i = PROJECT_STATUSES.indexOf((status ?? "") as (typeof PROJECT_STATUSES)[number]);
  return i < 0 ? 0 : Math.round((i / (PROJECT_STATUSES.length - 1)) * 100);
}

/** Persentase waktu jadwal yang sudah terlewati. */
export function timeProgress(start?: string | null, end?: string | null, today = todayIso()): number | null {
  if (!start || !end) return null;
  const s = toDayNo(start);
  const e = toDayNo(end);
  if (e <= s) return toDayNo(today) >= e ? 100 : 0;
  return Math.round(Math.min(1, Math.max(0, (toDayNo(today) - s) / (e - s))) * 100);
}

export type Health = "on-track" | "at-risk" | "late";

export interface RunningProject {
  project: Project;
  stage: number;
  time: number | null;
  daysLeft: number | null;
  health: Health;
}

/**
 * Proyek belum Done, urut dari yang paling bermasalah. "Terlambat" = lewat
 * tenggat; "Berisiko" = waktu terpakai melampaui progres tahap > 25 poin.
 */
export function runningProjects(projects: readonly Project[], today = todayIso()): RunningProject[] {
  const rank: Record<Health, number> = { late: 0, "at-risk": 1, "on-track": 2 };
  return projects
    .filter((p) => p.status?.status_name !== DONE)
    .map((project) => {
      const stage = stageProgress(project.status?.status_name);
      const time = timeProgress(project.start_date, project.end_date, today);
      const daysLeft = project.end_date ? toDayNo(project.end_date) - toDayNo(today) : null;
      const health: Health =
        daysLeft !== null && daysLeft < 0
          ? "late"
          : time !== null && time - stage > 25
            ? "at-risk"
            : "on-track";
      return { project, stage, time, daysLeft, health };
    })
    .sort(
      (a, b) =>
        rank[a.health] - rank[b.health] || (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity),
    );
}

/* ---------- Katalog ---------- */

export function severityCounts(items: readonly CatalogVulna[]) {
  const out = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<(typeof SEVERITIES)[number], number>;
  for (const c of items) {
    const hit = SEVERITIES.find((s) => s.toLowerCase() === c.severity.toLowerCase());
    if (hit) out[hit]++;
  }
  return out;
}
