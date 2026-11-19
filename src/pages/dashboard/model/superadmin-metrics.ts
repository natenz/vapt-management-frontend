/**
 * Agregasi dashboard Superadmin. Backend belum punya endpoint statistik, jadi
 * semua angka dihitung di sini dari data mentah per modul (proyek, report per
 * proyek, user, beban kerja, katalog, riwayat status). Fungsi murni agar mudah diuji.
 */
import { addMonths, differenceInCalendarDays, format, startOfDay, startOfMonth } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { CatalogVulna } from "@/entities/catalog";
import type { ProjectReport } from "@/entities/finding";
import type { Project, ProjectStatus, ResourceLoad, StatusLog } from "@/entities/project";
import type { User } from "@/entities/user";
import { PROJECT_STATUSES, SEVERITIES } from "@/shared/api/schemas";

const DONE = "Done";
const OPEN_FINDING = new Set(["open"]);
export const FINDING_STATUS_ORDER = ["open", "closed"] as const;
export type FindingStatusKey = (typeof FINDING_STATUS_ORDER)[number];

const statusOf = (p: Project) => p.status?.status_name ?? "";
const day = (v?: string | null) => (v ? startOfDay(new Date(v)) : null);

/* ---------- Proyek & siklus ---------- */

export function daysUntil(end?: string | null, today = new Date()): number | null {
  const d = day(end);
  return d ? differenceInCalendarDays(d, startOfDay(today)) : null;
}

export interface ProjectKpis {
  total: number;
  active: number;
  done: number;
  /** Lewat end_date dan belum Done. */
  overdue: number;
  /** Tenggat 0–3 hari lagi. */
  dueSoon: number;
}

export function projectKpis(projects: readonly Project[], today = new Date()): ProjectKpis {
  let active = 0;
  let done = 0;
  let overdue = 0;
  let dueSoon = 0;
  for (const p of projects) {
    if (statusOf(p) === DONE) {
      done++;
      continue;
    }
    active++;
    const days = daysUntil(p.end_date, today);
    if (days === null) continue;
    if (days < 0) overdue++;
    else if (days <= 3) dueSoon++;
  }
  return { total: projects.length, active, done, overdue, dueSoon };
}

/** Proyek aktif yang paling dekat tenggatnya (terlambat lebih dulu). */
export function upcomingDeadlines(projects: readonly Project[], limit = 6, today = new Date()) {
  return projects
    .filter((p) => statusOf(p) !== DONE && p.end_date)
    .map((p) => ({ project: p, days: daysUntil(p.end_date, today)! }))
    .sort((a, b) => a.days - b.days)
    .slice(0, limit);
}

export interface FunnelStage {
  name: string;
  count: number;
}

/** Jumlah proyek per tahap, urut sesuai master status (fallback ke urutan bawaan 10 tahap). */
export function stageFunnel(
  projects: readonly Project[],
  statuses?: readonly ProjectStatus[] | null,
): FunnelStage[] {
  const order =
    statuses && statuses.length > 0
      ? [...statuses].sort((a, b) => a.status_process_id - b.status_process_id).map((s) => s.status_name)
      : [...PROJECT_STATUSES];
  const counts = new Map<string, number>(order.map((n) => [n, 0]));
  for (const p of projects) {
    const s = statusOf(p);
    if (counts.has(s)) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return order.map((name) => ({ name, count: counts.get(name) ?? 0 }));
}

export interface TrendPoint {
  label: string;
  /** Proyek yang mulai pada bulan ini. */
  started: number;
  /** Proyek Done yang berakhir pada bulan ini. */
  completed: number;
}

/** Tren `months` bulan terakhir (termasuk bulan berjalan). */
export function monthlyTrend(
  projects: readonly Project[],
  months = 12,
  today = new Date(),
): TrendPoint[] {
  const first = startOfMonth(addMonths(today, -(months - 1)));
  const buckets = Array.from({ length: months }, (_, i) => {
    const m = addMonths(first, i);
    return { key: format(m, "yyyy-MM"), label: format(m, "MMM yy", { locale: idLocale }), started: 0, completed: 0 };
  });
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of projects) {
    const s = p.start_date?.slice(0, 7);
    const si = s ? index.get(s) : undefined;
    if (si !== undefined) buckets[si]!.started++;
    if (statusOf(p) === DONE) {
      const e = p.end_date?.slice(0, 7);
      const ei = e ? index.get(e) : undefined;
      if (ei !== undefined) buckets[ei]!.completed++;
    }
  }
  return buckets.map(({ label, started, completed }) => ({ label, started, completed }));
}

/** Proyek yang sudah mungkin memiliki temuan (Assessment ke atas). */
export const hasFindingsStage = (p: Project) => {
  const i = PROJECT_STATUSES.indexOf(statusOf(p) as (typeof PROJECT_STATUSES)[number]);
  return i >= PROJECT_STATUSES.indexOf("Assessment");
};

/* ---------- Temuan & risiko ---------- */

export type SeverityName = (typeof SEVERITIES)[number];

export interface FindingTotals {
  total: number;
  open: number;
  bySeverity: Record<SeverityName, number>;
  /** Severity untuk temuan yang masih terbuka (open). */
  openBySeverity: Record<SeverityName, number>;
  byStatus: Record<FindingStatusKey, number>;
}

const zeroSeverity = () =>
  Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<SeverityName, number>;

const normalizeSeverity = (s: string): SeverityName => {
  const hit = SEVERITIES.find((v) => v.toLowerCase() === s.toLowerCase());
  return hit ?? (s.toLowerCase() === "info" ? "Informational" : "Informational");
};

export function findingTotals(reports: readonly Pick<ProjectReport, "findings">[]): FindingTotals {
  const bySeverity = zeroSeverity();
  const openBySeverity = zeroSeverity();
  const byStatus = Object.fromEntries(FINDING_STATUS_ORDER.map((s) => [s, 0])) as Record<
    FindingStatusKey,
    number
  >;
  let total = 0;
  let open = 0;
  for (const r of reports) {
    for (const f of r.findings) {
      total++;
      const sev = normalizeSeverity(f.severity);
      bySeverity[sev]++;
      const st = f.status.toLowerCase() as FindingStatusKey;
      if (st in byStatus) byStatus[st]++;
      if (OPEN_FINDING.has(st)) {
        open++;
        openBySeverity[sev]++;
      }
    }
  }
  return { total, open, bySeverity, openBySeverity, byStatus };
}

export interface RiskRow {
  project: Project;
  critical: number;
  high: number;
  open: number;
}

/** Proyek dengan temuan terbuka terberat: Critical, lalu High, lalu total terbuka. */
export function riskiestProjects(reports: readonly ProjectReport[], limit = 5): RiskRow[] {
  return reports
    .map((r) => {
      const open = r.findings.filter((f) => OPEN_FINDING.has(f.status.toLowerCase()));
      return {
        project: r.project,
        critical: open.filter((f) => normalizeSeverity(f.severity) === "Critical").length,
        high: open.filter((f) => normalizeSeverity(f.severity) === "High").length,
        open: open.length,
      };
    })
    .filter((r) => r.open > 0)
    .sort((a, b) => b.critical - a.critical || b.high - a.high || b.open - a.open)
    .slice(0, limit);
}

/* ---------- Tim & mandays ---------- */

export const TEAM_ROLES = ["pentester", "technical_writer", "project_manager"] as const;
const ROLE_ORDER = ["super_admin", "tech_lead", "project_manager", "pentester", "technical_writer"];

export function roleComposition(users: readonly User[]): { role: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const u of users) {
    const r = u.role?.role_name ?? "lainnya";
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a.role);
      const ib = ROLE_ORDER.indexOf(b.role);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
}

/**
 * MD yang ditugaskan ke pentester bulan ini. Fakta saja: belum ada aturan resmi batas
 * beban per orang (BE tidak menegakkannya), jadi tidak ada "kapasitas" atau "lewat batas".
 */
export interface TeamMandays {
  pentesters: number;
  team: number;
  /** Total MD pentester di bulan berjalan. */
  used: number;
  /** Pentester yang punya penugasan (MD > 0) bulan ini. */
  assigned: number;
  /** Pentester dengan MD tertinggi lebih dulu. */
  ranking: { user: User; mandays: number }[];
}

export function teamMandays(
  users: readonly User[],
  loadMap: Readonly<Record<number, ResourceLoad>>,
): TeamMandays {
  const pentesters = users.filter((u) => u.role?.role_name === "pentester");
  const ranking = pentesters
    .map((user) => ({ user, mandays: loadMap[user.sys_user_id]?.mandays ?? 0 }))
    .sort((a, b) => b.mandays - a.mandays);
  const used = Math.round(ranking.reduce((s, r) => s + r.mandays, 0) * 10) / 10;
  return {
    pentesters: pentesters.length,
    team: users.filter((u) => (TEAM_ROLES as readonly string[]).includes(u.role?.role_name ?? "")).length,
    used,
    assigned: ranking.filter((r) => r.mandays > 0).length,
    ranking,
  };
}

/* ---------- Katalog & aktivitas ---------- */

export function catalogStats(
  approved: readonly CatalogVulna[],
  pending: readonly CatalogVulna[],
  rejected: readonly CatalogVulna[],
) {
  const total = approved.length + pending.length + rejected.length;
  return {
    approved: approved.length,
    pending: pending.length,
    rejected: rejected.length,
    total,
    /** Persentase pengajuan yang disetujui dari yang sudah ditinjau. */
    approvalRate:
      approved.length + rejected.length === 0
        ? null
        : Math.round((approved.length / (approved.length + rejected.length)) * 100),
  };
}

export interface ActivityItem {
  id: string;
  project: Project;
  status: string;
  at: string;
}

/** Perubahan status terbaru lintas proyek. */
export function recentActivity(
  logsByProject: ReadonlyMap<number, readonly StatusLog[]>,
  projects: readonly Project[],
  limit = 10,
): ActivityItem[] {
  const byId = new Map(projects.map((p) => [p.project_id, p]));
  const items: ActivityItem[] = [];
  for (const [projectId, logs] of logsByProject) {
    const project = byId.get(projectId);
    if (!project) continue;
    for (const log of logs) {
      items.push({
        id: `${projectId}:${log.status_process_log_id}`,
        project,
        status: log.status_name,
        at: log.status_create_at,
      });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** Proyek yang paling baru diperbarui, sumber feed aktivitas. */
export function recentlyUpdated(projects: readonly Project[], limit = 8): Project[] {
  return [...projects]
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "") || b.project_id - a.project_id)
    .slice(0, limit);
}
