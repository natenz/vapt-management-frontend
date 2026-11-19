import { addDays } from "date-fns";
import type { ProjectDetail } from "@/entities/project";
import type { User } from "@/entities/user";
import type { DateRange } from "@/shared/lib/date-range";
import { parseDateOnly } from "@/shared/lib/date-range";
import { exclusiveEnd } from "@/shared/ui/svar-gantt";

// Tidak ada filter "tersedia/lewat batas": belum ada aturan resmi batas beban per orang.
export interface ResourceTimelineFilters {
  search: string;
  roles: string[];
}

export const DEFAULT_RESOURCE_TIMELINE_FILTERS: ResourceTimelineFilters = {
  search: "",
  roles: [],
};

export interface ResourceTimelineTask {
  id: string;
  text: string;
  start: Date;
  end: Date;
  endInclusive: Date;
  type: "task" | "summary";
  parent?: string;
  open?: boolean;
  kind: "user" | "assignment" | "empty";
  // User row fields
  userId?: number;
  userName?: string;
  roleName?: string;
  initials?: string;
  department?: string;
  totalMandays?: number;
  childCount?: number;
  // Assignment row fields
  projectId?: number;
  projectName?: string;
  assetName?: string;
  statusName?: string;
  allocatedMandays?: number;
}

const roleOf = (u: User) => u.role?.role_name ?? "";
const nameOf = (u: User) => u.profile?.full_name?.trim() || u.username?.trim() || "Pengguna";

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";

export function buildResourceTimelineTasks(
  users: readonly User[],
  projects: readonly ProjectDetail[],
  filters: ResourceTimelineFilters,
  range: DateRange,
  collapsedUserIds: ReadonlySet<string>,
  loadMap: Readonly<Record<number, { mandays?: number }>> = {},
): ResourceTimelineTask[] {
  const query = filters.search.trim().toLowerCase();
  const rangeStart = range.start;
  const rangeEnd = exclusiveEnd(range.end);

  // Kumpulkan penugasan per sys_user_id
  const userAssignments = new Map<number, ResourceTimelineTask[]>();

  for (const p of projects) {
    const pStart = parseDateOnly(p.start_date);
    const pEnd = parseDateOnly(p.end_date);
    const isDone = p.status?.status_name === "Done";

    // 1. Penugasan Mandays Pentester
    for (const m of p.mandays) {
      const mStart = parseDateOnly(m.start_date) || pStart;
      const mEnd = parseDateOnly(m.end_date) || pEnd;
      if (!mStart || !mEnd || mEnd < mStart) continue;

      // Cek overlap rentang
      if (mEnd < rangeStart || mStart > range.end) continue;

      const list = userAssignments.get(m.pentester_id) ?? [];
      const assetLabel = m.asset?.asset_name ? ` · ${m.asset.asset_name}` : "";
      list.push({
        id: `mandays:${p.project_id}:${m.mandays_id}`,
        parent: `user:${m.pentester_id}`,
        text: `${p.project_name}${assetLabel}`,
        start: mStart,
        end: exclusiveEnd(mEnd),
        endInclusive: mEnd,
        type: "task",
        kind: "assignment",
        projectId: p.project_id,
        projectName: p.project_name,
        assetName: m.asset?.asset_name ?? undefined,
        statusName: p.status?.status_name ?? undefined,
        allocatedMandays: m.allocated_mandays,
      });
      userAssignments.set(m.pentester_id, list);
    }

    // 2. Project Manager
    if (p.pm_id && pStart && pEnd && pEnd >= pStart && !isDone) {
      if (!(pEnd < rangeStart || pStart > range.end)) {
        const list = userAssignments.get(p.pm_id) ?? [];
        // Hindari duplikasi jika PM juga dicatat di tempat lain
        if (!list.some((x) => x.projectId === p.project_id && x.id.startsWith("pm:"))) {
          list.push({
            id: `pm:${p.project_id}:${p.pm_id}`,
            parent: `user:${p.pm_id}`,
            text: `${p.project_name} (PM)`,
            start: pStart,
            end: exclusiveEnd(pEnd),
            endInclusive: pEnd,
            type: "task",
            kind: "assignment",
            projectId: p.project_id,
            projectName: p.project_name,
            statusName: p.status?.status_name ?? undefined,
          });
          userAssignments.set(p.pm_id, list);
        }
      }
    }

    // 3. Resources Tim Lainnya (misal Technical Writer)
    if (!isDone && pStart && pEnd && pEnd >= pStart && !(pEnd < rangeStart || pStart > range.end)) {
      for (const r of p.resources) {
        const uid = r.user?.sys_user?.sys_user_id ?? r.user?.sys_user_id;
        if (uid != null) {
          const list = userAssignments.get(uid) ?? [];
          if (!list.some((x) => x.projectId === p.project_id)) {
            list.push({
              id: `res:${p.project_id}:${uid}`,
              parent: `user:${uid}`,
              text: p.project_name,
              start: pStart,
              end: exclusiveEnd(pEnd),
              endInclusive: pEnd,
              type: "task",
              kind: "assignment",
              projectId: p.project_id,
              projectName: p.project_name,
              statusName: p.status?.status_name ?? undefined,
            });
            userAssignments.set(uid, list);
          }
        }
      }
    }
  }

  // Filter & Urutkan Pengguna
  const filteredUsers = users.filter((u) => {
    const role = roleOf(u);
    // Role filter
    if (filters.roles.length > 0 && !filters.roles.includes(role)) {
      return false;
    }

    const assignments = userAssignments.get(u.sys_user_id) ?? [];
    // Search filter
    if (query) {
      const name = nameOf(u).toLowerCase();
      const uname = (u.username ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const matchSelf = name.includes(query) || uname.includes(query) || email.includes(query);
      const matchProject = assignments.some(
        (a) =>
          a.projectName?.toLowerCase().includes(query) ||
          a.assetName?.toLowerCase().includes(query),
      );
      if (!matchSelf && !matchProject) return false;
    }

    return true;
  });

  // Susun hirarki tasks untuk SVAR Gantt
  const result: ResourceTimelineTask[] = [];

  for (const u of filteredUsers) {
    const uid = u.sys_user_id;
    const userKey = `user:${uid}`;
    const assignments = userAssignments.get(uid) ?? [];
    const fullName = nameOf(u);
    const role = roleOf(u);
    const totalMd = loadMap[uid]?.mandays ?? 0;
    const isOpen = !collapsedUserIds.has(userKey);

    // Tentukan tanggal rentang baris induk personil
    let userStart = rangeStart;
    let userEnd = addDays(rangeStart, 1);

    if (assignments.length > 0) {
      const starts = assignments.map((a) => a.start.getTime());
      const ends = assignments.map((a) => a.end.getTime());
      userStart = new Date(Math.max(rangeStart.getTime(), Math.min(...starts)));
      userEnd = new Date(Math.min(rangeEnd.getTime(), Math.max(...ends)));
      if (userEnd <= userStart) {
        userEnd = addDays(userStart, 1);
      }
    }

    // Baris Induk Personil
    result.push({
      id: userKey,
      text: fullName,
      start: userStart,
      end: userEnd,
      endInclusive: addDays(userEnd, -1),
      type: "summary",
      open: isOpen,
      kind: "user",
      userId: uid,
      userName: fullName,
      roleName: role,
      initials: getInitials(fullName),
      department: u.profile?.department ?? undefined,
      totalMandays: totalMd,
      childCount: assignments.length,
    });

    // Baris Anak (Penugasan Proyek)
    for (const a of assignments) {
      result.push(a);
    }
  }

  return result;
}
