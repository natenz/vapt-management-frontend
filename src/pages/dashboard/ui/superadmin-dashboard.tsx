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
import { BentoCard, BentoGrid } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { CapacityGauge, StackedBarChart } from "@/shared/ui/charts";
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

  const stageStackedItems = useMemo(
    () => [
      { label: "Planning", count: stageDistribution.Planning ?? 0, colorClass: "bg-sky-500" },
      { label: "Assessment", count: stageDistribution.Assessment ?? 0, colorClass: "bg-amber-500" },
      { label: "Remediasi", count: stageDistribution.Remediasi ?? 0, colorClass: "bg-rose-500" },
      { label: "Retesting", count: stageDistribution.Retesting ?? 0, colorClass: "bg-purple-600" },
    ],
    [stageDistribution],
  );

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

      {/* SECTION 2: BENTO GRID DUA KOLOM (Kesehatan Proyek & Kapasitas Tim) */}
      <BentoGrid aria-label="Bento Grid Eksekutif">
        {/* Kolom Kiri (7 Col): Proyek Prioritas & Status Breakdown */}
        <BentoCard
          colSpan={7}
          role="region"
          aria-label="Proyek Prioritas & Tenggat"
          title="Proyek Prioritas"
          description="Proyek dengan tenggat terdekat yang perlu dipantau."
          icon={<FolderKanban />}
          action={
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs p-0 h-auto">
              <Link to="/projects">Buka semua proyek</Link>
            </Button>
          }
        >
          {/* Quick Stage Stacked Bar Chart */}
          <div className="rounded-md border border-border/70 bg-surface-subtle/40 p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink">Distribusi Tahapan Aktif</span>
              <span className="text-[11px] text-ink-muted">
                {activeProjects.length} proyek aktif
              </span>
            </div>
            <StackedBarChart items={stageStackedItems} height={8} />
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
        </BentoCard>

        {/* Kolom Kanan (5 Col): Pantauan Kapasitas Tim (Workload Watchdog) */}
        <BentoCard
          colSpan={5}
          role="region"
          aria-label="Pantauan Kapasitas Tim"
          title="Kapasitas & Alokasi Tim"
          description={`Batas beban maksimal: ${MANDAYS_LIMIT} MD / bulan`}
          icon={<Clock />}
          action={
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs p-0 h-auto">
              <Link to="/resources?tampilan=timeline">Linimasa Tim</Link>
            </Button>
          }
        >
          {/* Capacity Gauge */}
          <div className="mb-3">
            <CapacityGauge
              current={Math.round(totalMandays)}
              limit={Math.max(pentesterCount * MANDAYS_LIMIT, 20)}
              label="Total Alokasi Pentester"
              subtext={`${overloadedUsers.length > 0 ? `${overloadedUsers.length} pentester melebihi batas alokasi` : "Alokasi kapasitas tim normal"}`}
            />
          </div>

          {/* Overload Alert atau Status Sehat */}
          {overloadedUsers.length > 0 ? (
            <div className="flex items-start gap-2.5 rounded-xs border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200 mb-2">
              <OctagonAlert className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-medium">
                  {overloadedUsers.length} Pentester Melebihi Batas Beban
                </span>
                <span className="text-rose-700/80 dark:text-rose-300/80">
                  Perlu penyesuaian jadwal atau redistribusi penugasan proyek.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xs border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 mb-2">
              <span className="font-medium">Kapasitas tim saat ini aman</span>
              <span>· Tidak ada personil melebihi {MANDAYS_LIMIT} MD.</span>
            </div>
          )}

          {/* Top 5 Pentester Workload List */}
          <div className="flex flex-col divide-y divide-border/60 max-h-[220px] overflow-y-auto mb-3">
            {teamUsers
              .filter((u) => u.role?.role_name === "pentester")
              .map((u) => {
                const md = loadMap[u.sys_user_id]?.mandays ?? 0;
                const isOver = isOverLimit(md);
                const uInfo = toUserProfileInfo(u);
                return (
                  <div
                    key={u.sys_user_id}
                    className="flex items-center justify-between py-2 px-1 hover:bg-surface-subtle/60 rounded-xs transition-colors"
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
                          <span className="text-xs font-medium text-ink truncate max-w-[130px]">
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

          <Button asChild variant="outline" className="w-full text-xs h-8 mt-auto">
            <Link to="/resources">Buka Alokasi Mandays Tim</Link>
          </Button>
        </BentoCard>
      </BentoGrid>

      {/* SECTION 3: PINTASAN TATA KELOLA ADMINISTRATOR */}
      <section className="flex flex-col gap-3" aria-label="Pintasan Administrasi">
        <h2 className="text-title-md text-ink">Pintasan Tata Kelola Sistem</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/users"
            className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
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
            className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
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
            className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
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
            className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
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
