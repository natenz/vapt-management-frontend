import { addDays } from "date-fns";
import type { Project } from "@/entities/project";
import { PROJECT_STATUSES } from "@/entities/project";
import type { DateRange } from "@/shared/lib/date-range";
import { parseDateOnly } from "@/shared/lib/date-range";

/*
 * Adapter data proyek (GET /projects) → baris SVAR Gantt.
 * Murni fungsi tanpa efek samping agar mudah diuji. Tanggal jadwal diambil
 * HANYA dari start_date/end_date proyek (bukan dari mandays).
 */

export type TimelineGroupBy = "none" | "status" | "pm";
export type TimelineSortKey = "start" | "end" | "name";

export interface TimelineFilters {
  search: string;
  statuses: string[];
  pms: string[];
  groupBy: TimelineGroupBy;
  sort: TimelineSortKey;
}

export const DEFAULT_TIMELINE_FILTERS: TimelineFilters = {
  search: "",
  statuses: [],
  pms: [],
  groupBy: "none",
  sort: "start",
};

export const TIMELINE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_TIMELINE_PAGE_SIZE = 10;

export const GROUP_BY_OPTIONS: { value: TimelineGroupBy; label: string }[] = [
  { value: "none", label: "Tanpa grup" },
  { value: "status", label: "Status" },
  { value: "pm", label: "Project Manager" },
];

export const SORT_OPTIONS: { value: TimelineSortKey; label: string }[] = [
  { value: "start", label: "Tanggal mulai" },
  { value: "end", label: "Tanggal selesai" },
  { value: "name", label: "Nama proyek" },
];

export const NO_PM_LABEL = "Tanpa PM";
export const NO_STATUS_LABEL = "Tanpa status";

/** Proyek dengan jadwal valid. `end` inklusif (tanggal kalender terakhir). */
export interface ScheduledProject {
  project: Project;
  start: Date;
  end: Date;
}

/** Baris tugas yang diberikan ke SVAR Gantt. */
export interface TimelineTask {
  id: string;
  text: string;
  start: Date;
  /** Eksklusif (hari setelah tanggal akhir), sesuai cara SVAR menggambar batang. */
  end: Date;
  type: "task" | "summary";
  parent?: string;
  open?: boolean;
  kind: "project" | "group" | "empty";
  projectId?: number;
  client?: string;
  statusName?: string;
  pmName?: string;
  /** Tanggal akhir inklusif untuk ditampilkan di tooltip. */
  endInclusive: Date;
  childCount?: number;
}

export const statusNameOf = (p: Project) => p.status?.status_name?.trim() || NO_STATUS_LABEL;

export function pmNameOf(p: Project): string {
  const name = p.pm?.profile?.full_name?.trim() || p.pm?.username?.trim();
  return name || NO_PM_LABEL;
}

/** Ubah proyek menjadi jadwal valid; `null` bila tanggal kosong/tidak valid/terbalik. */
export function toScheduledProject(project: Project): ScheduledProject | null {
  const start = parseDateOnly(project.start_date);
  const end = parseDateOnly(project.end_date);
  if (!start || !end || end < start) return null;
  return { project, start, end };
}

/** Pisahkan proyek terjadwal dan jumlah proyek tanpa jadwal valid. */
export function partitionScheduled(projects: Project[]) {
  const scheduled: ScheduledProject[] = [];
  let unscheduledCount = 0;
  for (const p of projects) {
    const item = toScheduledProject(p);
    if (item) scheduled.push(item);
    else unscheduledCount += 1;
  }
  return { scheduled, unscheduledCount };
}

const overlaps = (item: ScheduledProject, range: DateRange) =>
  item.start <= range.end && item.end >= range.start;

export function filterTimelineProjects(
  items: ScheduledProject[],
  filters: Pick<TimelineFilters, "search" | "statuses" | "pms">,
  range: DateRange,
): ScheduledProject[] {
  const q = filters.search.trim().toLowerCase();
  const statuses = new Set(filters.statuses);
  const pms = new Set(filters.pms);
  return items.filter((item) => {
    const { project } = item;
    if (!overlaps(item, range)) return false;
    if (statuses.size > 0 && !statuses.has(statusNameOf(project))) return false;
    if (pms.size > 0 && !pms.has(pmNameOf(project))) return false;
    if (!q) return true;
    return (
      project.project_name.toLowerCase().includes(q) ||
      (project.client_name ?? "").toLowerCase().includes(q)
    );
  });
}

const collator = new Intl.Collator("id", { sensitivity: "base", numeric: true });

export function sortTimelineProjects(
  items: ScheduledProject[],
  sort: TimelineSortKey,
): ScheduledProject[] {
  const byName = (a: ScheduledProject, b: ScheduledProject) =>
    collator.compare(a.project.project_name, b.project.project_name);
  const compare = {
    start: (a: ScheduledProject, b: ScheduledProject) =>
      a.start.getTime() - b.start.getTime() || byName(a, b),
    end: (a: ScheduledProject, b: ScheduledProject) =>
      a.end.getTime() - b.end.getTime() || byName(a, b),
    name: byName,
  }[sort];
  return [...items].sort(compare);
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(page, 1), pageCount);
  const from = (current - 1) * pageSize;
  return { page: current, pageCount, items: items.slice(from, from + pageSize) };
}

function projectTask(item: ScheduledProject, parent?: string): TimelineTask {
  const { project, start, end } = item;
  return {
    id: `project:${project.project_id}`,
    text: project.project_name,
    start,
    end: addDays(end, 1),
    endInclusive: end,
    type: "task",
    parent,
    kind: "project",
    projectId: project.project_id,
    client: project.client_name,
    statusName: statusNameOf(project),
    pmName: pmNameOf(project),
  };
}

function groupOrder(groupBy: Exclude<TimelineGroupBy, "none">, names: string[]): string[] {
  if (groupBy === "status") {
    const known: string[] = [...PROJECT_STATUSES];
    const rank = (n: string) => (known.includes(n) ? known.indexOf(n) : known.length);
    return [...names].sort((a, b) => rank(a) - rank(b) || collator.compare(a, b));
  }
  // PM alfabetis; "Tanpa PM" selalu terakhir
  return [...names].sort((a, b) =>
    a === NO_PM_LABEL ? 1 : b === NO_PM_LABEL ? -1 : collator.compare(a, b),
  );
}

/**
 * Bangun baris Gantt. Pengelompokan dilakukan di frontend sebagai baris induk
 * (hierarki MIT `parent`/`open`) — bukan fitur `groupBy` PRO. Rentang induk
 * dihitung manual dari anak-anaknya.
 */
export function buildTimelineTasks(
  items: ScheduledProject[],
  groupBy: TimelineGroupBy,
  collapsed: ReadonlySet<string> = new Set(),
): TimelineTask[] {
  if (groupBy === "none") return items.map((item) => projectTask(item));

  const keyOf = groupBy === "status" ? statusNameOf : pmNameOf;
  const buckets = new Map<string, ScheduledProject[]>();
  for (const item of items) {
    const key = keyOf(item.project);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const tasks: TimelineTask[] = [];
  for (const name of groupOrder(groupBy, [...buckets.keys()])) {
    const children = buckets.get(name) ?? [];
    const first = children[0];
    if (!first) continue;
    const id = `group:${groupBy}:${name}`;
    let start = first.start;
    let end = first.end;
    for (const c of children) {
      if (c.start < start) start = c.start;
      if (c.end > end) end = c.end;
    }
    tasks.push({
      id,
      text: name,
      start,
      end: addDays(end, 1),
      endInclusive: end,
      type: "summary",
      open: !collapsed.has(id),
      kind: "group",
      statusName: groupBy === "status" ? name : undefined,
      pmName: groupBy === "pm" ? name : undefined,
      childCount: children.length,
    });
    for (const c of children) tasks.push(projectTask(c, id));
  }
  return tasks;
}

function countBy(items: ScheduledProject[], keyOf: (p: Project) => string) {
  const counts = new Map<string, number>();
  for (const { project } of items) {
    const key = keyOf(project);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Opsi filter status (urutan siklus proyek) dari proyek terjadwal. */
export function getTimelineStatusOptions(items: ScheduledProject[]) {
  const counts = countBy(items, statusNameOf);
  return groupOrder("status", [...counts.keys()]).map((value) => ({
    value,
    count: counts.get(value) ?? 0,
  }));
}

/** Opsi filter PM (alfabetis) dari proyek terjadwal. */
export function getTimelinePmOptions(items: ScheduledProject[]) {
  const counts = countBy(items, pmNameOf);
  return groupOrder("pm", [...counts.keys()]).map((value) => ({
    value,
    count: counts.get(value) ?? 0,
  }));
}
