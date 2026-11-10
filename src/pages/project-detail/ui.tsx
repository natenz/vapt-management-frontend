import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bug, FileText } from "lucide-react";
import { Link, useParams } from "react-router";
import {
  changeProjectStatus,
  getProject,
  listStatuses,
  ProjectStatusBadge,
  PROJECT_STATUSES,
} from "@/entities/project";
import { useSession } from "@/entities/session";
import { getErrorDetails } from "@/shared/api/api-error";
import { fmtDate, fmtRange } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";
import { Stepper } from "@/shared/ui/stepper";
import { notify } from "@/shared/ui/toast";
import { ManageAssets, DeleteAssetButton } from "@/features/manage-assets";
import { AssignMandays } from "@/features/assign-mandays";
import { FindingsPanel } from "@/widgets/project-findings-panel";
import { ProjectGanttSection } from "@/widgets/project-gantt-section";
import { TeamSidebar } from "@/widgets/project-team-sidebar";

// Siapa boleh memajukan status. Cermin aturan di BE (service/project_service.go) agar tombol
// tidak muncul bagi role yang pasti ditolak. BE tetap sumber kebenaran.
const NEXT: Record<string, { to: string; label: string; roles: string[]; back?: { to: string; label: string } }> = {
  Draft: { to: "Planning", label: "Serahkan ke Project Manager", roles: ["tech_lead", "super_admin"] },
  Planning: { to: "Pentest", label: "Mulai Pentest", roles: ["project_manager", "super_admin"] },
  Pentest: { to: "Reporting", label: "Selesai Pentest, mulai Reporting", roles: ["project_manager", "super_admin"] },
  Reporting: { to: "Remediation", label: "Serahkan laporan untuk Remediasi", roles: ["technical_writer", "project_manager", "super_admin"] },
  Remediation: { to: "Retest", label: "Minta Retest", roles: ["project_manager", "super_admin"] },
  Retest: { to: "Done", label: "Tandai Selesai", roles: ["project_manager", "super_admin"], back: { to: "Remediation", label: "Masih ada yang rentan, kembali ke Remediasi" } },
};

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const id = Number(projectId);
  const queryClient = useQueryClient();
  const sessionUser = useSession((s) => s.user);
  const role = sessionUser?.role?.role_name ?? "";
  const project = useQuery({ queryKey: ["project", id], queryFn: () => getProject(id), enabled: Number.isFinite(id) });
  const statuses = useQuery({ queryKey: ["statuses"], queryFn: listStatuses });

  const advance = useMutation({
    mutationFn: (statusId: number) => changeProjectStatus(id, statusId),
    onSuccess: (p) => {
      void queryClient.invalidateQueries({ queryKey: ["project", id] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      notify.success("Status diperbarui", { description: `Sekarang: ${p.status?.status_name ?? "-"}` });
    },
  });

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
  const currentIndex = Math.max(0, PROJECT_STATUSES.indexOf(current as (typeof PROJECT_STATUSES)[number]));
  const next = NEXT[current];
  const nextStatus = statuses.data?.find((s) => s.status_name === next?.to);
  const backStatus = statuses.data?.find((s) => s.status_name === next?.back?.to);
  // BE: PM hanya boleh mengelola proyek miliknya (pm_id); TL dan Superadmin untuk semua.
  const ownsAsPm = role !== "project_manager" || p.pm_id === sessionUser?.sys_user_id;
  const canAdvance = Boolean(next && nextStatus && next.roles.includes(role) && ownsAsPm);

  let advanceBlockReason: string | null = null;
  if (current === "Draft" && next?.to === "Planning") {
    if (p.resources.length === 0) {
      advanceBlockReason = "Proyek harus memiliki minimal 1 resource tim.";
    }
  } else if (current === "Planning" && next?.to === "Pentest") {
    if (p.assets.length === 0) {
      advanceBlockReason = "Tambahkan minimal 1 aset sebelum memulai pentest.";
    } else {
      const allocatedAssetIds = new Set(p.mandays.map((m) => m.asset_id));
      const unallocated = p.assets.find((a) => !allocatedAssetIds.has(a.assets_id));
      if (unallocated) {
        advanceBlockReason = `Aset "${unallocated.asset_name}" belum di-assign pentester di timeline.`;
      }
    }
  }

  // BE: aset hanya bisa diubah saat Draft/Planning oleh PM pemilik (atau admin).
  const canEditAssets = current === "Planning" && ownsAsPm && (role === "project_manager" || role === "super_admin");
  // Assign pentester per aset: urusan PM pemilik proyek saja (TL hanya buat template dan tim).
  const canAssign = current === "Planning" && role === "project_manager" && ownsAsPm;

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
              ) : null}
            </div>
          ) : (
            <ProjectStatusBadge name={current} />
          )
        }
      />

      {advance.error ? (
        <Alert tone="error" title="Status belum bisa diubah">
          {getErrorDetails(advance.error).length > 0
            ? getErrorDetails(advance.error).join(", ")
            : advance.error.message}
        </Alert>
      ) : null}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        {[
          ["Rentang tanggal", fmtRange(p.start_date, p.end_date)],
          ["Project Manager", p.pm?.profile?.full_name ?? p.pm?.username ?? "-"],
          ["Total mandays", `${p.total_mandays} md`],
          ["Aset / anggota tim", `${p.assets.length} aset · ${p.resources.length} orang`],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 bg-surface p-4">
            <dt className="text-caption text-ink-muted">{k}</dt>
            <dd className="text-title-sm text-ink tabular">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-8">
      <section aria-label="Tahap proyek" className="flex flex-col gap-5 rounded-md border border-border bg-surface p-6">
        <Progress value={(currentIndex / (PROJECT_STATUSES.length - 1)) * 100} aria-label="Kemajuan proyek" />
        <Stepper steps={PROJECT_STATUSES.map((s) => ({ id: s, label: s }))} currentIndex={currentIndex} allDone={current === "Done"} />
      </section>

      <section aria-label="Aset">
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
          <h2 className="text-title-md text-ink">Aset <span className="text-body-sm text-ink-muted">({p.total_mandays} mandays)</span></h2>
          {p.assets.length === 0 ? <p className="text-body-sm text-ink-muted">Belum ada aset. Project Manager yang mengisinya.</p> : (
            <ul className="flex flex-col divide-y divide-border">
              {p.assets.map((a) => (
                <li key={a.assets_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="flex flex-col">
                    <span className="text-title-sm text-ink">{a.asset_name}</span>
                    <span className="text-body-sm text-ink-muted">{a.asset_type} · {a.domain || a.ip_address || "-"}</span>
                  </span>
                  <span className="flex items-center gap-2 text-body-sm text-ink-secondary tabular">
                    {a.mandays} md · {a.pentester?.profile?.full_name ?? a.pentester?.username ?? "belum ada pentester"}
                    {canEditAssets ? <DeleteAssetButton projectId={id} asset={a} /> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ProjectGanttSection project={p} />

      {canEditAssets ? <ManageAssets projectId={id} /> : null}

      {canAssign ? <AssignMandays project={p} /> : null}

      {["Pentest", "Reporting", "Remediation", "Retest", "Done"].includes(current) ? <FindingsPanel project={p} /> : null}

      <footer className="flex flex-wrap gap-3">
        {(role === "pentester" || role === "super_admin") && ["Pentest", "Retest"].includes(current) ? (
          <Button asChild leadingIcon={<Bug />}><Link to={`/projects/${id}/findings/new`}>Tambah temuan</Link></Button>
        ) : null}
        {["Reporting", "Remediation", "Retest", "Done"].includes(current) ? (
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
