import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BookCheck,
  ClipboardCheck,
  Clock,
  FolderKanban,
  OctagonAlert,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import type { CatalogVulna } from "@/entities/catalog";
import { ProjectStatusBadge, type Project, type ResourceLoad } from "@/entities/project";
import { toUserProfileInfo, UserProfilePopover, type User } from "@/entities/user";
import { isOverLimit, MANDAYS_LIMIT } from "@/shared/config/workload";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

interface SuperAdminDashboardProps {
  projects: readonly Project[];
  users: readonly User[];
  catalogQueue: readonly CatalogVulna[];
  loadMap: Readonly<Record<number, ResourceLoad>>;
  isLoading: boolean;
}

function calculateDeadline(end?: string | null, today = new Date()) {
  if (!end) return { text: "-", tone: "", days: 999 };
  const days = differenceInCalendarDays(startOfDay(new Date(end)), startOfDay(today));
  if (days < 0) return { text: `Lewat ${-days} hari`, tone: "text-error font-medium", days };
  if (days === 0) return { text: "Hari ini", tone: "text-warning font-medium", days: 0 };
  return {
    text: `${days} hari lagi`,
    tone: days <= 3 ? "text-warning font-medium" : "text-ink-muted",
    days,
  };
}

export function SuperAdminDashboard({
  projects,
  users,
  catalogQueue,
  loadMap,
  isLoading,
}: SuperAdminDashboardProps) {
  // Proyek aktif & statistik tenggat
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status?.status_name !== "Done"),
    [projects],
  );

  const urgentProjects = useMemo(
    () =>
      activeProjects.filter((p) => {
        const { days } = calculateDeadline(p.end_date);
        return days <= 3;
      }),
    [activeProjects],
  );

  // Proyek terurut berdasarkan tenggat terdekat (prioritas pemantauan)
  const priorityProjects = useMemo(
    () =>
      [...activeProjects]
        .sort((a, b) => {
          const dA = calculateDeadline(a.end_date).days;
          const dB = calculateDeadline(b.end_date).days;
          return dA - dB;
        })
        .slice(0, 5),
    [activeProjects],
  );

  // Ringkasan distribusi tahap proyek
  const stageDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      Planning: 0,
      Assessment: 0,
      Remediasi: 0,
      Retesting: 0,
    };
    for (const p of activeProjects) {
      const s = p.status?.status_name;
      if (s && s in counts) {
        counts[s] = (counts[s] ?? 0) + 1;
      }
    }
    return counts;
  }, [activeProjects]);

  // Statistik Tim & Kapasitas
  const teamUsers = useMemo(
    () =>
      users.filter((u) =>
        ["pentester", "technical_writer", "project_manager"].includes(u.role?.role_name ?? ""),
      ),
    [users],
  );

  const pentesterCount = useMemo(
    () => users.filter((u) => u.role?.role_name === "pentester").length,
    [users],
  );

  const pmCount = useMemo(
    () => users.filter((u) => u.role?.role_name === "project_manager").length,
    [users],
  );

  // Total Mandays dan personil overloaded
  const { totalMandays, overloadedUsers } = useMemo(() => {
    let sum = 0;
    const overloaded: { user: User; mandays: number }[] = [];

    for (const u of teamUsers) {
      const md = loadMap[u.sys_user_id]?.mandays ?? 0;
      sum += md;
      if (u.role?.role_name === "pentester" && isOverLimit(md)) {
        overloaded.push({ user: u, mandays: md });
      }
    }
    return {
      totalMandays: Math.round(sum * 10) / 10,
      overloadedUsers: overloaded.sort((a, b) => b.mandays - a.mandays),
    };
  }, [teamUsers, loadMap]);

  return (
    <div className="flex flex-col gap-8" data-slot="superadmin-dashboard">
      {/* SECTION 1: EXECUTIVE KPI TILES */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Ringkasan Eksekutif Sistem"
      >
        <SummaryTile
          label="Proyek Aktif"
          value={isLoading ? null : activeProjects.length}
          unit="Proyek"
          icon={<FolderKanban />}
          fill="brand"
          loading={isLoading}
          note={{
            value: urgentProjects.length > 0 ? `${urgentProjects.length} proyek` : undefined,
            text:
              urgentProjects.length > 0
                ? "mendekati tenggat (≤ 3 hari)"
                : `${projects.length} total proyek terdaftar`,
          }}
        />

        <SummaryTile
          label="Personil Tim"
          value={isLoading ? null : teamUsers.length}
          unit="Orang"
          icon={<Users />}
          loading={isLoading}
          note={{
            text: `${pentesterCount} pentester, ${pmCount} PM aktif`,
          }}
        />

        <SummaryTile
          label="Beban Mandays"
          value={isLoading ? null : Math.round(totalMandays)}
          unit="MD"
          icon={<Clock />}
          loading={isLoading}
          note={{
            value: overloadedUsers.length > 0 ? `${overloadedUsers.length} orang` : undefined,
            text:
              overloadedUsers.length > 0
                ? "melebihi batas alokasi (> 20 MD)"
                : "semua alokasi kapasitas normal",
          }}
        />

        <SummaryTile
          label="Antrean Katalog"
          value={isLoading ? null : catalogQueue.length}
          unit="Pengajuan"
          icon={<ShieldAlert />}
          loading={isLoading}
          note={{
            text:
              catalogQueue.length > 0
                ? "Menunggu peninjauan & approval"
                : "Katalog celah keamanan mutakhir",
          }}
        />
      </section>

      {/* SECTION 2: GRID DUA KOLOM (Kesehatan Proyek & Kapasitas Tim) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (7 Col): Proyek Prioritas & Status Breakdown */}
        <section
          className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5 lg:col-span-7"
          aria-label="Proyek Prioritas & Tenggat"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-title-md text-ink">Proyek Prioritas</h2>
              <p className="text-body-sm text-ink-muted">
                Proyek dengan tenggat terdekat yang perlu dipantau.
              </p>
            </div>
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs">
              <Link to="/projects">Buka semua proyek</Link>
            </Button>
          </div>

          {/* Quick Stage Chips */}
          <div className="flex flex-wrap items-center gap-2 py-1">
            <span className="text-xs text-ink-muted">Distribusi tahap:</span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-sky-50 dark:bg-sky-400/15 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-300">
              Planning: <strong className="font-medium">{stageDistribution.Planning}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-amber-50 dark:bg-amber-400/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
              Assessment: <strong className="font-medium">{stageDistribution.Assessment}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-rose-50 dark:bg-rose-400/15 px-2 py-0.5 text-xs text-rose-700 dark:text-rose-300">
              Remediasi: <strong className="font-medium">{stageDistribution.Remediasi}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-purple-50 dark:bg-purple-400/15 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">
              Retesting: <strong className="font-medium">{stageDistribution.Retesting}</strong>
            </span>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : priorityProjects.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">
              Belum ada proyek aktif yang terjadwal.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table boxed>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyek</TableHead>
                    <TableHead>Tahap</TableHead>
                    <TableHead>PM</TableHead>
                    <TableHead>Tenggat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priorityProjects.map((p) => {
                    const due = calculateDeadline(p.end_date);
                    const pmInfo = toUserProfileInfo(p.pm, "PM");
                    return (
                      <TableRow key={p.project_id}>
                        <TableCell>
                          <Link
                            to={`/projects/${p.project_id}`}
                            className="flex flex-col focus-ring hover:text-brand"
                          >
                            <span className="text-title-sm font-normal text-ink">
                              {p.project_name}
                            </span>
                            <span className="text-caption text-ink-muted">{p.client_name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <ProjectStatusBadge name={p.status?.status_name ?? ""} />
                        </TableCell>
                        <TableCell>
                          {p.pm ? (
                            <UserProfilePopover user={pmInfo}>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-xs text-left text-xs text-ink-secondary hover:text-ink focus-ring"
                              >
                                <Avatar size="sm" className="size-5 text-[9px] shrink-0">
                                  <AvatarFallback className="bg-surface-subtle text-ink font-normal text-[9px]">
                                    {pmInfo.initials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[100px]">{pmInfo.name}</span>
                              </button>
                            </UserProfilePopover>
                          ) : (
                            <span className="text-xs text-ink-muted">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs text-ink tabular">{fmtDate(p.end_date)}</span>
                            <span className={cn("text-[11px]", due.tone)}>{due.text}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Kolom Kanan (5 Col): Pantauan Kapasitas Tim (Workload Watchdog) */}
        <section
          className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5 lg:col-span-5"
          aria-label="Pantauan Kapasitas Tim"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-title-md text-ink">Kapasitas & Alokasi Tim</h2>
              <p className="text-body-sm text-ink-muted">
                Batas beban maksimal: {MANDAYS_LIMIT} MD / bulan
              </p>
            </div>
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs">
              <Link to="/resources?tampilan=timeline">Linimasa Tim</Link>
            </Button>
          </div>

          {/* Overload Alert atau Status Sehat */}
          {overloadedUsers.length > 0 ? (
            <div className="flex items-start gap-2.5 rounded-xs border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-400/30 dark:bg-rose-400/10">
              <OctagonAlert className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex flex-col text-xs text-rose-800 dark:text-rose-200">
                <span className="font-medium">
                  {overloadedUsers.length} Pentester Melebihi Batas Beban
                </span>
                <span className="text-rose-700/80 dark:text-rose-300/80">
                  Perlu penyesuaian jadwal atau redistribusi penugasan proyek.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xs border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
              <span className="font-medium">Kapasitas tim saat ini aman</span>
              <span>· Tidak ada personil yang melebihi {MANDAYS_LIMIT} MD.</span>
            </div>
          )}

          {/* Top 5 Pentester Workload List */}
          <div className="flex flex-col divide-y divide-border/60">
            {teamUsers
              .filter((u) => u.role?.role_name === "pentester")
              .map((u) => {
                const md = loadMap[u.sys_user_id]?.mandays ?? 0;
                const isOver = isOverLimit(md);
                const uInfo = toUserProfileInfo(u);
                return (
                  <div
                    key={u.sys_user_id}
                    className="flex items-center justify-between py-2.5 px-1 hover:bg-surface-subtle/60 rounded-xs transition-colors"
                  >
                    <UserProfilePopover user={uInfo}>
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left focus-ring rounded-xs"
                      >
                        <Avatar size="sm" className="size-6 text-[10px] shrink-0">
                          <AvatarFallback className="bg-surface-subtle text-ink font-normal text-[10px]">
                            {uInfo.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-ink truncate max-w-[140px] sm:max-w-[180px]">
                            {uInfo.name}
                          </span>
                          <span className="text-[10px] text-ink-muted">Pentester</span>
                        </div>
                      </button>
                    </UserProfilePopover>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-normal tabular-nums",
                        isOver
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300 font-medium"
                          : "bg-surface-subtle text-ink-secondary",
                      )}
                    >
                      {isOver ? <AlertTriangle className="size-3 text-rose-600" /> : null}
                      <span>{md} MD</span>
                    </span>
                  </div>
                );
              })}
          </div>

          <Button asChild variant="outline" className="w-full text-xs mt-auto">
            <Link to="/resources">Buka Alokasi Mandays Tim</Link>
          </Button>
        </section>
      </div>

      {/* SECTION 3: PINTASAN TATA KELOLA ADMINISTRATOR */}
      <section className="flex flex-col gap-3" aria-label="Pintasan Administrasi">
        <h2 className="text-title-md text-ink">Pintasan Tata Kelola Sistem</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/users"
            className="group flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-xs bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
                <Users className="size-4" />
              </div>
              <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
            <div>
              <span className="text-title-sm font-medium text-ink group-hover:text-brand transition-colors">
                Manajemen Pengguna
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Kelola akun, hak akses role, dan departemen personil.
              </p>
            </div>
          </Link>

          <Link
            to="/projects/new"
            className="group flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
                <Plus className="size-4" />
              </div>
              <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
            <div>
              <span className="text-title-sm font-medium text-ink group-hover:text-brand transition-colors">
                Buat Proyek Baru
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Inisiasi template proyek pengujian keamanan baru.
              </p>
            </div>
          </Link>

          <Link
            to="/catalog"
            className="group flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-xs bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                <BookCheck className="size-4" />
              </div>
              <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
            <div>
              <span className="text-title-sm font-medium text-ink group-hover:text-brand transition-colors">
                Katalog Kerentanan
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Standarisasi basis data kerentanan & ACC celah baru.
              </p>
            </div>
          </Link>

          <Link
            to="/reports"
            className="group flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                <ClipboardCheck className="size-4" />
              </div>
              <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
            <div>
              <span className="text-title-sm font-medium text-ink group-hover:text-brand transition-colors">
                Laporan & Dokumentasi
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Audit kompilasi dan arsip laporan VAPT selesai.
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
