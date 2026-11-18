import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  BookCheck,
  CalendarRange,
  Check,
  Clock,
  ExternalLink,
  Eye,
  FolderKanban,
  Layers,
  LineChart,
  PieChart,
  Plus,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { reviewCatalog, type CatalogVulna } from "@/entities/catalog";
import { SeverityChip } from "@/entities/finding";
import {
  PROJECT_STATUSES,
  ProjectStatusBadge,
  type Project,
  type ResourceLoad,
} from "@/entities/project";
import { toUserProfileInfo, UserProfilePopover, type User } from "@/entities/user";
import { isOverLimit, MANDAYS_LIMIT } from "@/shared/config/workload";
import { cn } from "@/shared/lib/cn";
import { fmtDate, toSeverityKey } from "@/shared/lib/format";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { BentoCard, BentoGrid } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { AreaLineChart, CapacityGauge, DonutChart, StackedBarChart } from "@/shared/ui/charts";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { notify } from "@/shared/ui/toast";

export interface TechLeadDashboardProps {
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

function getProgressPercent(statusName?: string | null): number {
  if (!statusName) return 0;
  const index = PROJECT_STATUSES.indexOf(statusName as (typeof PROJECT_STATUSES)[number]);
  if (index < 0) return 0;
  return Math.min(100, Math.round((index / (PROJECT_STATUSES.length - 1)) * 100));
}

export function TechLeadDashboard({
  projects,
  users,
  catalogQueue,
  loadMap,
  isLoading,
}: TechLeadDashboardProps) {
  const queryClient = useQueryClient();
  const [selectedVulna, setSelectedVulna] = useState<CatalogVulna | null>(null);

  // Mutasi review katalog langsung dari dashboard
  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "approved" | "rejected" }) =>
      reviewCatalog(id, status),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      notify.success(
        vars.status === "approved"
          ? "Usulan kerentanan disetujui dan masuk ke katalog standar"
          : "Usulan kerentanan telah ditolak",
      );
      if (selectedVulna?.vulna_id === vars.id) {
        setSelectedVulna(null);
      }
    },
  });

  // 1. Proyek Aktif & Berjalan
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status?.status_name !== "Done"),
    [projects],
  );

  const testingProjects = useMemo(
    () =>
      activeProjects.filter((p) =>
        ["Assessment", "Retesting", "Analysis"].includes(p.status?.status_name ?? ""),
      ),
    [activeProjects],
  );

  // Proyek berjalan terurut berdasarkan tenggat terdekat
  const sortedActiveProjects = useMemo(
    () =>
      [...activeProjects].sort((a, b) => {
        const dA = calculateDeadline(a.end_date).days;
        const dB = calculateDeadline(b.end_date).days;
        return dA - dB;
      }),
    [activeProjects],
  );

  // Distribusi Tahap
  const stageSummary = useMemo(() => {
    const counts: Record<string, number> = {
      Planning: 0,
      Scoping: 0,
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

  // Stacked Bar Items untuk visualisasi tahapan
  const stageStackedItems = useMemo(
    () => [
      { label: "Planning", count: stageSummary.Planning ?? 0, colorClass: "bg-sky-500" },
      { label: "Scoping", count: stageSummary.Scoping ?? 0, colorClass: "bg-blue-600" },
      { label: "Assessment", count: stageSummary.Assessment ?? 0, colorClass: "bg-amber-500" },
      { label: "Remediasi", count: stageSummary.Remediasi ?? 0, colorClass: "bg-rose-500" },
      { label: "Retesting", count: stageSummary.Retesting ?? 0, colorClass: "bg-purple-600" },
    ],
    [stageSummary],
  );

  // 2. Analisis Ketersediaan Personil & Workload
  const pentesterList = useMemo(
    () => users.filter((u) => u.role?.role_name === "pentester"),
    [users],
  );

  // Pentesters terkelompok berdasarkan kapasitas
  const { availablePentesters, busyPentesters, overloadedPentesters } = useMemo(() => {
    const available: { user: User; mandays: number; remaining: number }[] = [];
    const busy: { user: User; mandays: number; remaining: number }[] = [];
    const overloaded: { user: User; mandays: number }[] = [];

    for (const p of pentesterList) {
      const md = loadMap[p.sys_user_id]?.mandays ?? 0;
      const remaining = Math.max(0, MANDAYS_LIMIT - md);

      if (isOverLimit(md)) {
        overloaded.push({ user: p, mandays: md });
      } else if (md >= 15) {
        busy.push({ user: p, mandays: md, remaining });
      } else {
        available.push({ user: p, mandays: md, remaining });
      }
    }

    return {
      availablePentesters: available.sort((a, b) => a.mandays - b.mandays),
      busyPentesters: busy.sort((a, b) => a.mandays - b.mandays),
      overloadedPentesters: overloaded.sort((a, b) => b.mandays - a.mandays),
    };
  }, [pentesterList, loadMap]);

  // Total Mandays akumulasi tim
  const totalMandays = useMemo(() => {
    let sum = 0;
    for (const p of pentesterList) {
      sum += loadMap[p.sys_user_id]?.mandays ?? 0;
    }
    return Math.round(sum * 10) / 10;
  }, [pentesterList, loadMap]);

  // Total kapasitas tim pentester (jumlah pentester * 20 MD)
  const totalCapacity = useMemo(
    () => Math.max(pentesterList.length * MANDAYS_LIMIT, 20),
    [pentesterList],
  );

  // Data tren 6 bulan terakhir untuk AreaLineChart
  const trendData = useMemo(() => {
    const months: { label: string; value: number; secondaryValue: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const mLabel = format(d, "MMM yyyy", { locale: idLocale });

      // Proyek aktif di bulan d (start_date <= mEnd && end_date >= mStart)
      const activeInMonth = projects.filter((p) => {
        if (!p.start_date || !p.end_date) return false;
        const pStart = new Date(p.start_date);
        const pEnd = new Date(p.end_date);
        return pStart <= mEnd && pEnd >= mStart;
      }).length;

      // Proyek selesai di bulan d
      const doneInMonth = projects.filter((p) => {
        if (p.status?.status_name !== "Done" || !p.end_date) return false;
        const pEnd = new Date(p.end_date);
        return pEnd >= mStart && pEnd <= mEnd;
      }).length;

      months.push({
        label: mLabel,
        value: activeInMonth,
        secondaryValue: doneInMonth,
      });
    }
    return months;
  }, [projects]);

  // Data severity untuk DonutChart
  const severitySegments = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0, Informational: 0 };
    for (const item of catalogQueue) {
      const sev = item.severity as keyof typeof counts;
      if (sev in counts) {
        counts[sev]++;
      }
    }

    const segments = [
      { label: "Critical", value: counts.Critical, color: "var(--color-sev-critical-bg)" },
      { label: "High", value: counts.High, color: "var(--color-sev-high-bg)" },
      { label: "Medium", value: counts.Medium, color: "var(--color-sev-medium-bg)" },
      { label: "Low", value: counts.Low, color: "var(--color-sev-low-bg)" },
      { label: "Info", value: counts.Informational, color: "var(--color-sev-info-bg)" },
    ];

    const activeSegments = segments.filter((s) => s.value > 0);
    if (activeSegments.length === 0) {
      return [{ label: "Aman", value: 1, color: "var(--color-surface-subtle)" }];
    }
    return activeSegments;
  }, [catalogQueue]);

  return (
    <div className="flex flex-col gap-8" data-slot="techlead-dashboard">
      {/* SECTION 1: RINGKASAN EKSEKUTIF OPERASIONAL TECH LEAD */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Ringkasan Operasional Tech Lead"
      >
        <SummaryTile
          label="Proyek Berjalan"
          value={isLoading ? null : activeProjects.length}
          unit="Proyek"
          icon={<FolderKanban />}
          fill="brand"
          loading={isLoading}
          note={{
            value: testingProjects.length > 0 ? `${testingProjects.length} proyek` : undefined,
            text:
              testingProjects.length > 0
                ? "dalam fase pengujian aktif (Assessment/Retest)"
                : `${projects.length} total proyek terdata`,
          }}
        />

        <SummaryTile
          label="Ketersediaan Pentester"
          value={isLoading ? null : availablePentesters.length}
          unit="Siap Ditugaskan"
          icon={<UserCheck />}
          loading={isLoading}
          note={{
            text: `${availablePentesters.length} tersedia, ${busyPentesters.length} padat dari ${pentesterList.length} pentester`,
          }}
        />

        <SummaryTile
          label="Beban Mandays Tim"
          value={isLoading ? null : Math.round(totalMandays)}
          unit="MD"
          icon={<Clock />}
          loading={isLoading}
          note={{
            value:
              overloadedPentesters.length > 0
                ? `${overloadedPentesters.length} personil`
                : undefined,
            text:
              overloadedPentesters.length > 0
                ? "melebihi batas alokasi (> 20 MD)"
                : "seluruh alokasi mandays dalam batas aman",
          }}
        />

        <SummaryTile
          label="Antrean Usulan Katalog"
          value={isLoading ? null : catalogQueue.length}
          unit="Usulan"
          icon={<ShieldAlert />}
          loading={isLoading}
          note={{
            text:
              catalogQueue.length > 0
                ? "Menunggu peninjauan & persetujuan Anda"
                : "Basis data kerentanan mutakhir",
          }}
        />
      </section>

      {/* SECTION 2: BENTO BOX SAAS DASHBOARD (CHARTS & DECISION MATRIX) */}
      <BentoGrid aria-label="Bento Box Command Center">
        {/* BENTO CARD 1: HERO TREND CHART (Col 8) */}
        <BentoCard
          colSpan={8}
          title="Tren Aktivitas & Beban Proyek"
          description="Pantau siklus proyek aktif dan target selesai 6 bulan terakhir."
          icon={<LineChart />}
          badge={
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium">
              <TrendingUp className="size-3" />
              <span>Siklus Stabil</span>
            </span>
          }
          action={
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand" />
                <span>Proyek Aktif</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-ink-muted" />
                <span>Selesai (Done)</span>
              </span>
            </div>
          }
        >
          {isLoading ? (
            <Skeleton className="h-52 w-full mt-2" />
          ) : (
            <div className="pt-2 flex-1 flex flex-col justify-end">
              <AreaLineChart
                data={trendData}
                height={210}
                seriesName="Aktif"
                secondarySeriesName="Selesai"
                valueUnit="proyek"
              />
            </div>
          )}
        </BentoCard>

        {/* BENTO CARD 2: DONUT CHART TINGKAT KEPARAHAN (Col 4) */}
        <BentoCard
          colSpan={4}
          title="Tingkat Keparahan Usulan"
          description="Komposisi severity celah keamanan pada antrean katalog."
          icon={<PieChart />}
          action={
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs p-0 h-auto">
              <Link to="/catalog">Katalog</Link>
            </Button>
          }
        >
          {isLoading ? (
            <Skeleton className="h-52 w-full mt-2" />
          ) : (
            <div className="pt-2 flex-1 flex items-center justify-center">
              <DonutChart
                segments={severitySegments}
                centerValue={catalogQueue.length}
                centerLabel="Usulan"
                size={140}
                thickness={18}
              />
            </div>
          )}
        </BentoCard>

        {/* BENTO CARD 3: KETERSEDIAAN & PENUGASAN PERSONIL (Col 4) */}
        <BentoCard
          colSpan={4}
          role="region"
          aria-label="Ketersediaan & Penugasan Personil"
          title="Ketersediaan Personil"
          description="Status kapasitas untuk penugasan proyek baru."
          icon={<UserCheck />}
          action={
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs p-0 h-auto">
              <Link to="/resources?tampilan=timeline">Linimasa Tim</Link>
            </Button>
          }
        >
          <div className="flex flex-col gap-3.5 flex-1">
            {/* Total Capacity Gauge */}
            <CapacityGauge
              current={Math.round(totalMandays)}
              limit={totalCapacity}
              label="Alokasi Mandays Tim"
              subtext={`${availablePentesters.length} pentester siap menerima penugasan baru.`}
            />

            {/* Overload Alert jika ada */}
            {overloadedPentesters.length > 0 && (
              <div className="flex items-start gap-2 rounded-xs border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200">
                <AlertTriangle className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <span>{overloadedPentesters.length} Pentester Melebihi Batas (&gt; 20 MD)</span>
              </div>
            )}

            {/* List Personil */}
            <div className="flex flex-col divide-y divide-border/60 max-h-[190px] overflow-y-auto">
              {pentesterList.map((p) => {
                const md = loadMap[p.sys_user_id]?.mandays ?? 0;
                const isOver = isOverLimit(md);
                const isBusy = md >= 15 && !isOver;
                const pInfo = toUserProfileInfo(p);
                const remaining = Math.max(0, MANDAYS_LIMIT - md);

                return (
                  <div
                    key={p.sys_user_id}
                    className="flex items-center justify-between py-2 px-1 hover:bg-surface-subtle/60 rounded-xs transition-colors"
                  >
                    <UserProfilePopover user={pInfo}>
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left focus-ring rounded-xs"
                      >
                        <Avatar size="sm" className="size-6 text-[10px] shrink-0">
                          <AvatarFallback className="bg-surface-subtle text-ink font-normal text-[10px]">
                            {pInfo.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-ink truncate max-w-[130px]">
                            {pInfo.name}
                          </span>
                          <span className="text-[10px] text-ink-muted">
                            {isOver
                              ? "Kelebihan Beban"
                              : isBusy
                                ? "Mendekati Batas"
                                : `Sisa kapasitas: ${remaining} MD`}
                          </span>
                        </div>
                      </button>
                    </UserProfilePopover>

                    <span
                      className={cn(
                        "rounded-xs px-1.5 py-0.5 text-[10px] font-medium",
                        isOver
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-400/20 dark:text-rose-200"
                          : isBusy
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200",
                      )}
                    >
                      {isOver ? "Penuh" : isBusy ? "Padat" : "Tersedia"}
                    </span>
                  </div>
                );
              })}
            </div>

            <Button
              asChild
              variant="outline"
              leadingIcon={<CalendarRange />}
              className="w-full text-xs h-8 mt-auto"
            >
              <Link to="/resources?tampilan=timeline">Cek Benturan Jadwal di Linimasa</Link>
            </Button>
          </div>
        </BentoCard>

        {/* BENTO CARD 4: PROYEK BERJALAN & PROGRES (Col 8) */}
        <BentoCard
          colSpan={8}
          role="region"
          aria-label="Proyek Berjalan & Progres"
          title="Proyek Berjalan & Progres"
          description="Pantau kemajuan tiap tahap pengujian dan estimasi tenggat waktu."
          icon={<Layers />}
          action={
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs p-0 h-auto">
              <Link to="/projects">Buka semua proyek</Link>
            </Button>
          }
        >
          <div className="flex flex-col gap-3.5 flex-1">
            {/* Sebaran Tahapan (Stacked Bar Chart) */}
            <div className="rounded-md border border-border/70 bg-surface-subtle/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-ink">Distribusi Tahapan Aktif</span>
                <span className="text-[11px] text-ink-muted">
                  {activeProjects.length} proyek berjalan
                </span>
              </div>
              <StackedBarChart items={stageStackedItems} height={8} />
            </div>

            {/* Tabel Ringkas Proyek Berjalan */}
            {isLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : sortedActiveProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban />}
                title="Tidak ada proyek berjalan"
                description="Saat ini belum ada proyek VAPT yang sedang aktif."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table boxed>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyek</TableHead>
                      <TableHead>Tahap</TableHead>
                      <TableHead>Kemajuan</TableHead>
                      <TableHead>Tenggat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedActiveProjects.slice(0, 5).map((p) => {
                      const due = calculateDeadline(p.end_date);
                      const progress = getProgressPercent(p.status?.status_name);
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
                              <span className="text-caption text-ink-muted">
                                {p.client_name} · PM {pmInfo.name}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <ProjectStatusBadge name={p.status?.status_name ?? ""} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 min-w-[90px]">
                              <div className="flex items-center justify-between text-[10px] text-ink-muted">
                                <span>{progress}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                                <div
                                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
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
          </div>
        </BentoCard>
      </BentoGrid>

      {/* SECTION 3: PERSETUJUAN & MANAJEMEN KATALOG KERENTANAN */}
      <section
        className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6"
        aria-label="Persetujuan Usulan Katalog Kerentanan"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-title-md text-ink">Persetujuan Usulan Katalog Kerentanan</h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  catalogQueue.length > 0
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
                    : "bg-surface-subtle text-ink-secondary",
                )}
              >
                {catalogQueue.length} Usulan
              </span>
            </div>
            <p className="text-body-sm text-ink-muted">
              Validasi dan setujui temuan kerentanan baru yang diusulkan oleh pentester agar masuk ke
              standar katalog.
            </p>
          </div>
          <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs">
            <Link to="/catalog">Buka Basis Data Katalog Lengkap</Link>
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-44 w-full" />
        ) : catalogQueue.length === 0 ? (
          <EmptyState
            icon={<BookCheck />}
            title="Tidak ada usulan kerentanan pending"
            description="Semua usulan kerentanan dari tim pentester telah ditinjau dan disetujui. Standar katalog terkini."
            action={
              <Button asChild variant="outline" leadingIcon={<ExternalLink />}>
                <Link to="/catalog">Kelola Standar Katalog</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table boxed>
              <TableHeader>
                <TableRow>
                  <TableHead>Kerentanan</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Pengusul</TableHead>
                  <TableHead>Rekomendasi</TableHead>
                  <TableHead numeric>Aksi Persetujuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogQueue.map((item) => {
                  const creatorInfo = toUserProfileInfo(item.creator, "Pentester");
                  const isProcessing =
                    reviewMutation.isPending &&
                    reviewMutation.variables?.id === item.vulna_id;

                  return (
                    <TableRow key={item.vulna_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-title-sm font-normal text-ink">{item.title}</span>
                          {item.cvss_score ? (
                            <span className="text-caption text-ink-muted">
                              CVSS: {item.cvss_score}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <SeverityChip severity={toSeverityKey(item.severity)} />
                      </TableCell>
                      <TableCell>
                        <UserProfilePopover user={creatorInfo}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-left text-xs text-ink-secondary hover:text-ink focus-ring rounded-xs"
                          >
                            <Avatar size="sm" className="size-5 text-[9px] shrink-0">
                              <AvatarFallback className="bg-surface-subtle text-ink font-normal text-[9px]">
                                {creatorInfo.initials}
                              </AvatarFallback>
                            </Avatar>
                            <span>{creatorInfo.name}</span>
                          </button>
                        </UserProfilePopover>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="line-clamp-2 text-xs text-ink-secondary">
                          {item.remediation_recommendation || item.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell numeric>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="quiet"
                            leadingIcon={<Eye />}
                            onClick={() => setSelectedVulna(item)}
                            className="h-8 px-2.5 text-xs text-ink-secondary hover:text-ink"
                          >
                            Tinjau
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            leadingIcon={<Check />}
                            disabled={isProcessing}
                            onClick={() =>
                              reviewMutation.mutate({ id: item.vulna_id, status: "approved" })
                            }
                            className="h-8 px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10 border-emerald-300 dark:border-emerald-700"
                          >
                            Setujui
                          </Button>
                          <Button
                            type="button"
                            variant="quiet"
                            leadingIcon={<X />}
                            disabled={isProcessing}
                            onClick={() =>
                              reviewMutation.mutate({ id: item.vulna_id, status: "rejected" })
                            }
                            className="h-8 px-2.5 text-xs text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
                          >
                            Tolak
                          </Button>
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

      {/* SECTION 4: PINTASAN KERJA OPERASIONAL TECH LEAD */}
      <section className="flex flex-col gap-3" aria-label="Pintasan Kerja Tech Lead">
        <h2 className="text-title-md text-ink">Pintasan Kerja Tech Lead</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                Buat Project Template
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Inisiasi proyek baru, tentukan jadwal dan serahkan ke PM.
              </p>
            </div>
          </Link>

          <Link
            to="/resources?tampilan=timeline"
            className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-xs bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300">
                <CalendarRange className="size-4" />
              </div>
              <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
            <div>
              <span className="text-title-sm font-medium text-ink group-hover:text-brand transition-colors">
                Linimasa Beban Kerja
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Cek jadwal pentester di SVAR Gantt untuk cegah benturan waktu.
              </p>
            </div>
          </Link>

          <Link
            to="/resources"
            className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-8 items-center justify-center rounded-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                <Users className="size-4" />
              </div>
              <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
            </div>
            <div>
              <span className="text-title-sm font-medium text-ink group-hover:text-brand transition-colors">
                Alokasi Mandays Tim
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Pantau pembagian beban mandays per proyek dan personil.
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
                Standarisasi Katalog
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Kelola basis data kerentanan Telkom dan panduan remediasi.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* DIALOG TINJAU DETAIL USULAN KERENTANAN */}
      <Dialog
        open={Boolean(selectedVulna)}
        onOpenChange={(open) => !open && setSelectedVulna(null)}
      >
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{selectedVulna?.title}</DialogTitle>
              {selectedVulna?.severity ? (
                <SeverityChip severity={toSeverityKey(selectedVulna.severity)} />
              ) : null}
            </div>
            <DialogDescription>
              Diajukan oleh{" "}
              <strong>
                {selectedVulna?.creator?.profile?.full_name ??
                  selectedVulna?.creator?.username ??
                  "Pentester"}
              </strong>
              {selectedVulna?.cvss_score ? ` · Skor CVSS: ${selectedVulna.cvss_score}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 text-sm text-ink">
            {selectedVulna?.description ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-muted uppercase">
                  Deskripsi Kerentanan
                </span>
                <p className="rounded-xs bg-surface-subtle p-3 text-xs leading-relaxed text-ink whitespace-pre-wrap">
                  {selectedVulna.description}
                </p>
              </div>
            ) : null}

            {selectedVulna?.remediation_recommendation ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-muted uppercase">
                  Rekomendasi Remediasi
                </span>
                <p className="rounded-xs bg-surface-subtle p-3 text-xs leading-relaxed text-ink whitespace-pre-wrap">
                  {selectedVulna.remediation_recommendation}
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="quiet">
                Tutup
              </Button>
            </DialogClose>
            {selectedVulna ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  leadingIcon={<X />}
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({ id: selectedVulna.vulna_id, status: "rejected" })
                  }
                  className="text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
                >
                  Tolak Usulan
                </Button>
                <Button
                  type="button"
                  variant="solid"
                  leadingIcon={<Check />}
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({ id: selectedVulna.vulna_id, status: "approved" })
                  }
                >
                  Setujui Sekarang
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
