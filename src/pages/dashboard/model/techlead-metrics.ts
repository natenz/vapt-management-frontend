/**
 * Agregasi dashboard Tech Lead: progres proyek berjalan, beban pentester per
 * rentang tanggal, heatmap mingguan, dan pencarian slot jadwal proyek baru.
 *
 * Beban dihitung dari penugasan trx_mandays (detail proyek): allocated_mandays
 * dibagi rata per hari kalender start..end, sama seperti `mandaysInMonth`, lalu
 * diambil porsi yang jatuh di rentang yang ditanya. Kapasitas = hari kerja
 * (Senin–Jumat) di rentang itu, 1 MD per hari per orang.
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

/* ---------- Beban pentester ---------- */

export type LoadLevel = "free" | "busy" | "full";
/** < 50% longgar, ≤ 100% padat, > 100% melebihi kapasitas. */
export const loadLevel = (utilization: number): LoadLevel =>
  utilization > 1 ? "full" : utilization >= 0.5 ? "busy" : "free";

export interface PentesterWindowLoad {
  user: User;
  booked: number;
  capacity: number;
  free: number;
  utilization: number;
  level: LoadLevel;
  /** Proyek yang jadwal penugasannya beririsan dengan rentang. */
  projects: { id: number; name: string }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export const pentestersOf = (users: readonly User[]) =>
  users.filter((u) => u.role?.role_name === "pentester");

/** Beban tiap pentester pada rentang, urut dari yang paling longgar. */
export function loadInRange(
  pentesters: readonly User[],
  details: readonly ProjectDetail[],
  start: string,
  end: string,
): PentesterWindowLoad[] {
  const capacity = workingDays(start, end);
  const byUser = new Map<number, { booked: number; projects: Map<number, string> }>();
  for (const p of details) {
    for (const m of p.mandays) {
      const md = bookedInRange(m, start, end);
      if (md <= 0) continue;
      const entry = byUser.get(m.pentester_id) ?? { booked: 0, projects: new Map() };
      entry.booked += md;
      entry.projects.set(p.project_id, p.project_name);
      byUser.set(m.pentester_id, entry);
    }
  }
  return pentesters
    .map((user) => {
      const entry = byUser.get(user.sys_user_id);
      const booked = round1(entry?.booked ?? 0);
      const utilization = capacity === 0 ? 0 : booked / capacity;
      return {
        user,
        booked,
        capacity,
        free: round1(Math.max(0, capacity - booked)),
        utilization,
        level: loadLevel(utilization),
        projects: [...(entry?.projects ?? new Map<number, string>())].map(([id, name]) => ({ id, name })),
      };
    })
    .sort((a, b) => a.utilization - b.utilization || b.free - a.free);
}

export interface HeatmapWeek {
  start: string;
  end: string;
}

export interface HeatmapRow {
  user: User;
  cells: { booked: number; utilization: number; level: LoadLevel }[];
}

/** Heatmap beban mingguan (Senin–Jumat) `weeks` minggu mulai minggu ini. */
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
      const utilization = booked / 5;
      return { booked: round1(booked), utilization, level: loadLevel(utilization) };
    }),
  }));
  return { weeks: cols, rows };
}

export interface SlotSuggestion {
  start: string;
  end: string;
  candidates: PentesterWindowLoad[];
}

/**
 * Slot tercepat (mulai tiap Senin) di mana `teamSize` pentester masing-masing
 * terpakai < 50% selama `durationDays` hari kalender. Null bila tidak ada dalam horizon.
 */
export function findEarliestSlot(opts: {
  pentesters: readonly User[];
  details: readonly ProjectDetail[];
  durationDays: number;
  teamSize: number;
  from: string;
  horizonWeeks?: number;
}): SlotSuggestion | null {
  const { pentesters, details, durationDays, teamSize, from, horizonWeeks = 12 } = opts;
  if (teamSize < 1 || durationDays < 1 || pentesters.length < teamSize) return null;
  // Senin pertama yang tidak sebelum `from`
  let start = mondayOf(from);
  if (start < from) start = addDaysIso(start, 7);
  for (let i = 0; i < horizonWeeks; i++, start = addDaysIso(start, 7)) {
    const end = addDaysIso(start, durationDays - 1);
    const ranked = loadInRange(pentesters, details, start, end);
    const free = ranked.filter((r) => r.level === "free");
    if (free.length >= teamSize) return { start, end, candidates: free.slice(0, teamSize) };
  }
  return null;
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
