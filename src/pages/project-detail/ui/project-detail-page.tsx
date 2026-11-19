import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bug,
  CalendarRange,
  Clock,
  FileText,
  Info,
  Layers,
  UserCheck,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  changeProjectStatus,
  getProject,
  listStatuses,
  ProjectStatusBadge,
  PROJECT_STATUSES,
  statusBetween,
} from "@/entities/project";
import { useSession } from "@/entities/session";
import {
  TeamResourcesPopover,
  UserProfilePopover,
  toUserProfileInfo,
} from "@/entities/user";
import { fmtDate, fmtRange } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";
import { Stepper } from "@/shared/ui/stepper";
import { notify } from "@/shared/ui/toast";
import { AssetPlanner } from "@/features/asset-planner";
import { FindingsPanel } from "@/widgets/project-findings-panel";
import { ProjectGanttSection } from "@/widgets/project-gantt-section";
import { TeamSidebar } from "@/widgets/project-team-sidebar";

// Siapa boleh memajukan status. Cermin aturan di BE (service/project_service.go) agar tombol
// tidak muncul bagi role yang pasti ditolak. BE tetap sumber kebenaran.
// Tahap berlabel `auto` juga maju sendiri saat tanggal selesainya lewat (BE AutoAdvance); tombolnya untuk memajukan lebih cepat.
const PM = ["project_manager", "super_admin"];
const NEXT: Record<string, { to: string; label: string; roles: string[]; auto?: boolean; back?: { to: string; label: string } }> = {
  // Serah ke PM = kickoff: proyek langsung masuk Scoping, PM menyiapkan aset & pentester di tahap itu.
  Draft: { to: "Scoping", label: "Kickoff proyek", roles: ["tech_lead", "super_admin"] },
  Scoping: { to: "Assessment", label: "Mulai Assessment", roles: PM, auto: true },
  Assessment: { to: "Analysis", label: "Selesai Assessment, mulai Analysis", roles: PM, auto: true },
  Analysis: { to: "Initial Report", label: "Mulai Initial Report", roles: PM, auto: true },
  "Initial Report": { to: "Remediasi", label: "Serahkan laporan awal untuk Remediasi", roles: ["technical_writer", ...PM], auto: true },
  Remediasi: { to: "Retesting", label: "Klien selesai, mulai Retesting", roles: PM },
  Retesting: { to: "Final Report Drafting", label: "Selesai Retesting, susun Final Report", roles: PM, back: { to: "Remediasi", label: "Masih ada yang rentan, kembali ke Remediasi" } },
  "Final Report Drafting": { to: "Final Presentation", label: "Final Report siap, mulai Final Presentation", roles: PM, auto: true },
  "Final Presentation": { to: "Done", label: "Presentasi selesai, tutup proyek", roles: ["technical_writer", ...PM], auto: true },
};

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sessionUser = useSession((s) => s.user);
  const role = sessionUser?.role?.role_name ?? "";
  const project = useQuery({ queryKey: ["project", id], queryFn: () => getProject(id), enabled: Number.isFinite(id) });
  const statuses = useQuery({ queryKey: ["statuses"], queryFn: listStatuses });

  const advance = useMutation({
    mutationFn: (statusId: number) => changeProjectStatus(id, statusId),
    onSuccess: (p) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      notify.success("Status diperbarui", { description: `Sekarang: ${p.status?.status_name ?? "-"}` });
      // Tech Writer tidak lagi melihat proyek Done (batas di BE), jadi kembali ke dashboard.
      if (role === "technical_writer" && p.status?.status_name === "Done") {
        void navigate("/dashboard");
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });

  const pData = project.data;

  const pmProfile = useMemo(
    () => (pData?.pm ? toUserProfileInfo(pData.pm, "Project Manager") : null),
    [pData?.pm],
  );

  const teamProfiles = useMemo(() => {
    if (!pData?.resources) return [];
    const list = pData.resources.map((r) => {
      const sysUser = r.user?.sys_user;
      return toUserProfileInfo(
        sysUser ?? {
          sys_user_id: r.user_id,
          username: r.user?.full_name?.toLowerCase().replace(/\s+/g, ".") ?? `user.${r.user_id}`,
          profile: { user_id: r.user_id, full_name: r.user?.full_name ?? `User ${r.user_id}` },
        },
        r.user?.full_name ?? `User ${r.user_id}`,
      );
    });
    return Array.from(new Map(list.map((m) => [m.id ?? m.name, m])).values());
  }, [pData?.resources]);

  if (project.isLoading) return <Skeleton className="h-96" />;
  if (project.error || !project.data) {
    return <Alert tone="error" title="Proyek tidak ditemukan">{project.error?.message ?? "Anda tidak punya akses ke proyek ini."}</Alert>;
  }

  const p = project.data;
  const current = p.status?.status_name ?? "Draft";
  // PM baru melihat proyek setelah Tech Lead menyerahkannya (keluar dari Draft).
  if (role === "project_manager" && current === "Draft") {
    return <Alert tone="warning" title="Proyek belum diserahkan">Proyek ini masih Draft di Tech Lead.</Alert>;
  }
  const statusIndex = Math.max(0, PROJECT_STATUSES.indexOf(current as (typeof PROJECT_STATUSES)[number]));
  const next = NEXT[current];
  const nextStatus = statuses.data?.find((s) => s.status_name === next?.to);
  const backStatus = statuses.data?.find((s) => s.status_name === next?.back?.to);
  // BE: PM hanya boleh mengelola proyek miliknya (pm_id); TL dan Superadmin untuk semua.
  const ownsAsPm = role !== "project_manager" || p.pm_id === sessionUser?.sys_user_id;
  const canAdvance = Boolean(next && nextStatus && next.roles.includes(role) && ownsAsPm);
  // Syarat transisi, cermin BE checkTransitionPreconditions.
  let advanceBlockReason: string | null = null;
  if (current === "Draft") {
    if (p.resources.length === 0) {
      advanceBlockReason = "Proyek harus memiliki minimal 1 resource tim.";
    }
  } else if (current === "Scoping") {
    if (p.assets.length === 0) {
      advanceBlockReason = "Tambahkan minimal 1 aset sebelum Assessment.";
    } else {
      const allocatedAssetIds = new Set(p.mandays.map((m) => m.asset_id));
      const unallocated = p.assets.find((a) => !allocatedAssetIds.has(a.assets_id));
      if (unallocated) {
        advanceBlockReason = `Aset "${unallocated.asset_name}" belum di-assign pentester di timeline.`;
      }
    }
  }

  // Tahap yang lewat tanggal selesai tapi tidak maju sendiri: tahap manual (Remediasi/Retesting), atau tahap
  // otomatis yang tertahan syarat (BE AutoAdvance tidak melompati syarat, mis. Scoping tanpa pentester).
  const currentStage = p.stages?.find((s) => s.stage_name === current);
  const overdue = currentStage?.end_date && currentStage.end_date.slice(0, 10) < new Date().toISOString().slice(0, 10);
  const late = next && overdue && (!next.auto || advanceBlockReason) ? currentStage!.end_date! : null;

  // BE: aset hanya bisa diubah saat Draft/Scoping oleh PM pemilik (atau admin).
  const canEditAssets = current === "Scoping" && ownsAsPm && (role === "project_manager" || role === "super_admin");
  // Assign pentester per aset: urusan PM pemilik proyek saja (TL hanya buat template dan tim).
  const canAssign = current === "Scoping" && role === "project_manager" && ownsAsPm;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={p.project_name}
        description={`${p.client_name} · ${fmtRange(p.start_date, p.end_date)} · PM: ${p.pm?.profile?.full_name ?? p.pm?.username ?? "-"}`}
        action={
          canAdvance ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="solid"
                trailingIcon={<ArrowRight />}
                loading={advance.isPending}
                disabled={Boolean(advanceBlockReason)}
                title={advanceBlockReason ?? undefined}
                onClick={() => nextStatus && advance.mutate(nextStatus.status_process_id)}
              >
                {next!.label}
              </Button>
              {next?.back && backStatus ? (
                <Button variant="outline" loading={advance.isPending} onClick={() => advance.mutate(backStatus.status_process_id)}>
                  {next.back.label}
                </Button>
              ) : null}
              {advanceBlockReason ? (
                <span className="text-caption text-ink-muted">{advanceBlockReason}</span>
              ) : next?.auto ? (
                <span className="text-caption text-ink-muted">Maju otomatis setelah tanggal tahap ini lewat.</span>
              ) : null}
            </div>
          ) : (
            <ProjectStatusBadge name={current} />
          )
        }
      />

      {advance.error ? (
        <Alert tone="error" title="Status belum bisa diubah">
          {advance.error.message}
        </Alert>
      ) : null}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        {/* 1. Rentang tanggal */}
        <div className="flex flex-col gap-1.5 bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-caption text-ink-muted">
            <CalendarRange className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>Rentang tanggal</span>
          </dt>
          <dd className="text-title-sm text-ink tabular">{fmtRange(p.start_date, p.end_date)}</dd>
        </div>

        {/* 2. Project Manager */}
        <div className="flex flex-col gap-1.5 bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-caption text-ink-muted">
            <UserCheck className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>Project Manager</span>
          </dt>
          <dd className="mt-0.5">
            {p.pm && pmProfile ? (
              <UserProfilePopover user={pmProfile}>
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded-xs -ml-1 px-1 py-0.5 text-left transition-colors hover:bg-surface-subtle focus-ring"
                  aria-label={`Lihat profil Project Manager ${pmProfile.name}`}
                >
                  <Avatar size="sm" className="size-6 text-[10px] shrink-0 border border-border">
                    <AvatarFallback className="text-[10px] font-normal bg-surface-subtle text-ink">
                      {pmProfile.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-body-sm font-medium text-ink truncate group-hover:text-brand transition-colors">
                      {pmProfile.name}
                    </span>
                    {pmProfile.username ? (
                      <span className="text-[11px] text-ink-muted truncate">@{pmProfile.username}</span>
                    ) : null}
                  </div>
                </button>
              </UserProfilePopover>
            ) : (
              <span className="text-title-sm text-ink-muted">-</span>
            )}
          </dd>
        </div>

        {/* 3. Total mandays */}
        <div className="flex flex-col gap-1.5 bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-caption text-ink-muted">
            <Clock className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>Total mandays</span>
          </dt>
          <dd className="text-title-sm text-ink tabular">{p.total_mandays} md</dd>
        </div>

        {/* 4. Aset / anggota tim */}
        <div className="flex flex-col gap-1.5 bg-surface p-4">
          <dt className="flex items-center gap-1.5 text-caption text-ink-muted">
            <Layers className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>Aset & Anggota tim</span>
          </dt>
          <dd className="flex flex-wrap items-center justify-between gap-2 mt-0.5">
            <span className="text-body-sm font-normal text-ink tabular">
              {(p.assets ?? []).length} aset · {teamProfiles.length} orang
            </span>
            {teamProfiles.length > 0 ? (
              <TeamResourcesPopover members={teamProfiles}>
                <button
                  type="button"
                  className="group inline-flex items-center gap-1 rounded-xs -mr-1 px-1.5 py-0.5 text-left transition-colors hover:bg-surface-subtle focus-ring"
                  aria-label="Lihat profil anggota tim proyek"
                >
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {teamProfiles.slice(0, 3).map((m, i) => (
                      <Avatar
                        key={m.id ?? i}
                        size="sm"
                        className="size-5 text-[9px] shrink-0 border border-surface"
                        title={`${m.name} (${m.role ?? "Anggota"})`}
                      >
                        <AvatarFallback className="text-[9px] font-normal bg-surface-subtle text-ink">
                          {m.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {teamProfiles.length > 3 ? (
                      <span className="flex size-5 items-center justify-center rounded-full border border-surface bg-surface-subtle text-[8px] font-normal text-ink-muted">
                        +{teamProfiles.length - 3}
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-0.5 rounded-xs border border-border bg-surface px-1.5 py-0.5 text-[11px] font-normal text-ink-secondary shadow-xs opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
                    <Info className="size-3 text-ink-muted" aria-hidden="true" />
                    <span>Info</span>
                  </span>
                </button>
              </TeamResourcesPopover>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-label="Tahap proyek" className="flex flex-col gap-5 rounded-md border border-border bg-surface p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-title-md text-ink">Tahap proyek</h2>
              <span className="text-body-sm text-ink-muted">
                {statusIndex < 2 ? `${current}: belum kickoff` : `Hari ini ${fmtDate(new Date().toISOString())}`}
              </span>
            </div>
            <Progress value={(statusIndex / (PROJECT_STATUSES.length - 1)) * 100} aria-label="Kemajuan proyek" />
            <Stepper
              steps={PROJECT_STATUSES.map((s) => ({ id: s, label: s }))}
              currentIndex={statusIndex}
              allDone={current === "Done"}
            />
            {late ? (
              <Alert tone="warning" title={`Tahap ${current} melewati jadwal`}>
                Seharusnya selesai {fmtDate(late)}.{" "}
                {next?.auto && advanceBlockReason
                  ? `Belum bisa maju otomatis: ${advanceBlockReason}`
                  : "Tahap ini menunggu tindakan manual, jadi tidak maju otomatis."}
              </Alert>
            ) : null}
          </section>

          {/* PM mengisi aset & pentester tepat di bawah tahap, sebelum jadwal Gantt. */}
          {canEditAssets ? <AssetPlanner project={p} canAssign={canAssign} /> : null}

          <section aria-label="Aset">
            <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
              <h2 className="text-title-md text-ink">Aset <span className="text-body-sm text-ink-muted">({p.total_mandays} mandays)</span></h2>
              {p.assets.length === 0 ? <p className="text-body-sm text-ink-muted">Belum ada aset. Project Manager yang mengisinya.</p> : (
                <ul className="flex flex-col divide-y divide-border">
                  {p.assets.map((a) => {
                    // Mandays per pentester = baris trx_mandays aset ini, bukan total aset.
                    const rows = p.mandays.filter((m) => m.asset_id === a.assets_id);
                    const left = Math.round((a.mandays - rows.reduce((n, m) => n + m.allocated_mandays, 0)) * 100) / 100;
                    return (
                      <li key={a.assets_id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                        <span className="flex flex-col">
                          <span className="text-title-sm text-ink">{a.asset_name}</span>
                          <span className="text-body-sm text-ink-muted">{a.asset_type} · {a.domain || a.ip_address || "-"}</span>
                        </span>
                        <span className="flex flex-col items-end text-body-sm text-ink-secondary tabular">
                          <span>{a.mandays} md</span>
                          {rows.length === 0 ? <span className="text-ink-muted">belum ada pentester</span> : rows.map((m) => {
                            const pentesterProfile = toUserProfileInfo(m.pentester, `User ${m.pentester_id}`);
                            return (
                              <UserProfilePopover key={m.mandays_id} user={pentesterProfile} align="end">
                                <button
                                  type="button"
                                  className="group inline-flex items-center gap-1.5 rounded-xs px-1 py-0.5 text-caption text-ink-muted hover:bg-surface-subtle hover:text-ink focus-ring transition-colors"
                                  aria-label={`Lihat profil pentester ${pentesterProfile.name}`}
                                >
                                  <Avatar size="sm" className="size-4.5 text-[9px] shrink-0 border border-border">
                                    <AvatarFallback className="text-[9px] font-normal bg-surface-subtle text-ink">
                                      {pentesterProfile.initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium group-hover:text-brand transition-colors">
                                    {pentesterProfile.name}
                                  </span>
                                  <span className="text-ink-secondary">· {m.allocated_mandays} md</span>
                                </button>
                              </UserProfilePopover>
                            );
                          })}
                          {rows.length > 0 && left > 0 ? <span className="text-caption text-warning">belum dialokasikan {left} md</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <ProjectGanttSection
            project={p}
            canEdit={
              current !== "Done" &&
              (role === "super_admin" || role === "tech_lead" || (role === "project_manager" && ownsAsPm))
            }
          />

          {statusBetween(current, "Assessment", "Done") ? <FindingsPanel project={p} /> : null}

          <footer className="flex flex-wrap gap-3">
            {(role === "pentester" || role === "super_admin") && ["Assessment", "Retesting"].includes(current) ? (
              <Button asChild leadingIcon={<Bug />}><Link to={`/projects/${id}/findings/new`}>Tambah temuan</Link></Button>
            ) : null}
            {statusBetween(current, "Initial Report", "Done") ? (
              <Button asChild leadingIcon={<FileText />}><Link to={`/projects/${id}/report`}>Lihat laporan</Link></Button>
            ) : null}
            <span className="self-center text-caption text-ink-muted">{p.updated_at ? `Diperbarui ${fmtDate(p.updated_at)}` : ""}</span>
          </footer>
        </div>
        <TeamSidebar project={p} />
      </div>
    </div>
  );
}
