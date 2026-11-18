import { useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, startOfDay } from "date-fns";
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
  Plus,
  ShieldAlert,
  ShieldCheck,
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
import { Button } from "@/shared/ui/button";
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

      {/* SECTION 2: GRID DUA KOLOM (PROYEK BERJALAN & KETERSEDIAAN RESOURCE UNTUK ASSIGNMENT) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri (7 Col): Status & Progres Proyek Berjalan */}
        <section
          className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5 lg:col-span-7"
          aria-label="Proyek Berjalan & Progres"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-title-md text-ink">Proyek Berjalan & Progres</h2>
              <p className="text-body-sm text-ink-muted">
                Pantau kemajuan tiap tahap pengujian dan estimasi tenggat waktu.
              </p>
            </div>
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs">
              <Link to="/projects">Buka semua proyek</Link>
            </Button>
          </div>

          {/* Quick Stage Chips */}
          <div className="flex flex-wrap items-center gap-2 py-1">
            <span className="text-xs text-ink-muted">Tahap aktif:</span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-sky-50 dark:bg-sky-400/15 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-300">
              Scoping: <strong className="font-medium">{stageSummary.Scoping}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-amber-50 dark:bg-amber-400/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
              Assessment: <strong className="font-medium">{stageSummary.Assessment}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-rose-50 dark:bg-rose-400/15 px-2 py-0.5 text-xs text-rose-700 dark:text-rose-300">
              Remediasi: <strong className="font-medium">{stageSummary.Remediasi}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xs bg-purple-50 dark:bg-purple-400/15 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">
              Retesting: <strong className="font-medium">{stageSummary.Retesting}</strong>
            </span>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : sortedActiveProjects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban />}
              title="Tidak ada proyek berjalan"
              description="Saat ini belum ada proyek VAPT yang sedang aktif."
              action={
                <Button asChild variant="solid" leadingIcon={<Plus />}>
                  <Link to="/projects/new">Buat Proyek Baru</Link>
                </Button>
              }
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
                  {sortedActiveProjects.slice(0, 6).map((p) => {
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
                          <div className="flex flex-col gap-1 min-w-[110px]">
                            <div className="flex items-center justify-between text-[11px] text-ink-muted">
                              <span>Progres</span>
                              <span className="tabular-nums font-medium text-ink">
                                {progress}%
                              </span>
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
        </section>

        {/* Kolom Kanan (5 Col): Pemetaan Ketersediaan Personil untuk Penugasan Proyek Baru */}
        <section
          className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5 lg:col-span-5"
          aria-label="Ketersediaan & Penugasan Personil"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="text-title-md text-ink">Ketersediaan Personil</h2>
              <p className="text-body-sm text-ink-muted">
                Status kapasitas untuk penugasan proyek baru.
              </p>
            </div>
            <Button asChild variant="link" trailingIcon={<ArrowRight />} className="text-xs">
              <Link to="/resources?tampilan=timeline">Linimasa Tim</Link>
            </Button>
          </div>

          {/* Alert Kesiapan Tim */}
          {overloadedPentesters.length > 0 ? (
            <div className="flex items-start gap-2.5 rounded-xs border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-400/30 dark:bg-rose-400/10">
              <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="flex flex-col text-xs text-rose-800 dark:text-rose-200">
                <span className="font-medium">
                  {overloadedPentesters.length} Pentester Melebihi Batas (&gt; 20 MD)
                </span>
                <span className="text-rose-700/80 dark:text-rose-300/80">
                  Hindari menugaskan proyek baru pada personil ini sampai proyek berjalan selesai.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xs border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="font-medium">Kapasitas tim optimal</span>
                <span> · {availablePentesters.length} pentester siap ditugaskan proyek baru.</span>
              </div>
            </div>
          )}

          {/* Daftar Personil Pentester & Sisa Kapasitas */}
          <div className="flex flex-col divide-y divide-border/60 max-h-[360px] overflow-y-auto">
            {pentesterList.map((p) => {
              const md = loadMap[p.sys_user_id]?.mandays ?? 0;
              const isOver = isOverLimit(md);
              const isBusy = md >= 15 && !isOver;
              const pInfo = toUserProfileInfo(p);
              const remaining = Math.max(0, MANDAYS_LIMIT - md);

              return (
                <div
                  key={p.sys_user_id}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-surface-subtle/60 rounded-xs transition-colors"
                >
                  <UserProfilePopover user={pInfo}>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left focus-ring rounded-xs"
                    >
                      <Avatar size="sm" className="size-7 text-[10px] shrink-0">
                        <AvatarFallback className="bg-surface-subtle text-ink font-normal text-[10px]">
                          {pInfo.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-ink truncate max-w-[140px] sm:max-w-[160px]">
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

                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-normal tabular-nums",
                        isOver
                          ? "bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300 font-medium"
                          : isBusy
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
                      )}
                    >
                      {md} MD
                    </span>
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
                </div>
              );
            })}
          </div>

          {/* Quick Decision Action */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border mt-auto">
            <Button
              asChild
              variant="outline"
              leadingIcon={<CalendarRange />}
              className="w-full text-xs"
            >
              <Link to="/resources?tampilan=timeline">Cek Benturan Jadwal di Linimasa</Link>
            </Button>
          </div>
        </section>
      </div>

      {/* SECTION 3: PERSETUJUAN & MANAJEMEN KATALOG KERENTANAN */}
      <section
        className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5"
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
                Buat Project Template
              </span>
              <p className="text-caption text-ink-muted mt-0.5">
                Inisiasi proyek baru, tentukan jadwal dan serahkan ke PM.
              </p>
            </div>
          </Link>

          <Link
            to="/resources?tampilan=timeline"
            className="group flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
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
            className="group flex flex-col justify-between gap-3 rounded-md border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-xs focus-ring"
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
