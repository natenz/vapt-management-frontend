import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bug, CheckCheck, ClipboardCheck, FolderKanban, Hourglass, LayoutTemplate, Workflow } from "lucide-react";
import { Link } from "react-router";
import { listProjects } from "@/entities/project/api";
import { useSession } from "@/entities/session";
import { ROLE_LABEL, isRole } from "@/shared/config/roles";
import { fmtRange } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Progress } from "@/shared/ui/progress";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { PROJECT_STATUSES } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { PageHeader } from "@/shared/ui/page-header";
import { ProjectStatusBadge } from "@/shared/ui/project-status-badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { Alert } from "@/shared/ui/alert";

// Apa yang ditunggu tiap role (status proyek yang jadi "giliran" mereka).
const WAITING: Record<string, { statuses: string[]; hint: string }> = {
  tech_lead: { statuses: ["Draft"], hint: "Template draf yang belum diserahkan ke PM" },
  project_manager: { statuses: ["Planning"], hint: "Template menunggu aset dan assign Pentester" },
  pentester: { statuses: ["Pentest", "Retest"], hint: "Proyek yang perlu Anda uji" },
  technical_writer: { statuses: ["Reporting"], hint: "Proyek siap dikoreksi dan dibuatkan laporan" },
  super_admin: { statuses: [], hint: "" },
};

export function DashboardPage() {
  const user = useSession((s) => s.user);
  const role = user?.role?.role_name ?? "";
  const projects = useQuery({ queryKey: ["projects", "all"], queryFn: () => listProjects({ limit: 100 }) });

  // PM tidak melihat proyek Draft (belum diserahkan Tech Lead).
  const list = (projects.data?.data ?? []).filter((p) => !(role === "project_manager" && p.status?.status_name === "Draft"));
  const waiting = WAITING[role] ?? WAITING.super_admin!;
  const mine = list.filter((p) => waiting.statuses.includes(p.status?.status_name ?? ""));
  const running = list.filter((p) => !["Draft", "Done"].includes(p.status?.status_name ?? ""));
  const done = list.filter((p) => p.status?.status_name === "Done");
  const name = user?.profile?.full_name ?? user?.username ?? "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description={`Halo ${name}${isRole(role) ? ` (${ROLE_LABEL[role]})` : ""}. Ringkasan proyek yang relevan untuk peran Anda.`}
        action={
          role === "tech_lead" || role === "super_admin" ? (
            <Button asChild variant="solid" leadingIcon={<LayoutTemplate />}>
              <Link to="/projects/new">Buat Project Template</Link>
            </Button>
          ) : undefined
        }
      />

      {projects.error ? <Alert tone="error" title="Gagal memuat proyek">{projects.error.message}</Alert> : null}

      <section className="grid gap-4 md:grid-cols-3" aria-label="Ringkasan">
        <SummaryTile label="Giliran Anda" value={projects.isLoading ? null : mine.length} unit="Proyek" icon={<Hourglass />} fill="brand" loading={projects.isLoading} note={{ text: waiting.hint || "Seluruh proyek yang bisa Anda lihat" }} />
        <SummaryTile label="Sedang berjalan" value={projects.isLoading ? null : running.length} unit="Proyek" icon={<Workflow />} loading={projects.isLoading} note={{ text: "Tahap Planning sampai Retest" }} />
        <SummaryTile label="Selesai" value={projects.isLoading ? null : done.length} unit="Proyek" icon={<CheckCheck />} loading={projects.isLoading} note={{ text: "Status Done" }} />
      </section>

      <section aria-label="Sebaran tahap" className="rounded-md border border-border bg-surface p-6">
        <h2 className="mb-4 text-title-md text-ink">Sebaran per tahap</h2>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {PROJECT_STATUSES.map((s) => {
            const n = list.filter((p) => p.status?.status_name === s).length;
            const mineStage = waiting.statuses.includes(s);
            return (
              <li key={s} className={cn("flex flex-col gap-1 rounded-sm border p-3", mineStage ? "border-brand bg-brand-tint" : "border-border", n === 0 && !mineStage && "opacity-60")}>
                <span className={cn("text-heading-1 leading-none tabular", mineStage ? "text-brand" : "text-ink")}>{n}</span>
                <span className="text-caption text-ink-muted">{s}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="flex flex-col gap-4" aria-label="Proyek">
        <div className="flex items-center justify-between">
          <h2 className="text-title-md text-ink">{mine.length ? "Perlu tindakan" : "Proyek terbaru"}</h2>
          <Button asChild variant="link" trailingIcon={<ArrowRight />}>
            <Link to="/projects">Semua proyek</Link>
          </Button>
        </div>
        {projects.isLoading ? (
          <Skeleton className="h-40" />
        ) : (mine.length ? mine : list).length === 0 ? (
          <EmptyState icon={<FolderKanban />} title="Belum ada proyek" description="Proyek yang relevan untuk Anda akan muncul di sini." />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {(mine.length ? mine : list).slice(0, 6).map((p) => {
              const idx = Math.max(0, PROJECT_STATUSES.indexOf((p.status?.status_name ?? "Draft") as (typeof PROJECT_STATUSES)[number]));
              return (
                <li key={p.project_id}>
                  <Link
                    to={`/projects/${p.project_id}`}
                    className="group flex h-full flex-col gap-4 rounded-md border border-border bg-surface p-5 transition-colors duration-150 ease-out focus-ring hover:border-border-strong"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="flex flex-col gap-1">
                        <span className="text-title-sm text-ink">{p.project_name}</span>
                        <span className="text-body-sm text-ink-muted">{p.client_name} · {fmtRange(p.start_date, p.end_date)}</span>
                      </span>
                      <ProjectStatusBadge name={p.status?.status_name} />
                    </span>
                    <span className="flex flex-col gap-2">
                      <Progress value={(idx / (PROJECT_STATUSES.length - 1)) * 100} aria-label={`Tahap ${idx + 1} dari ${PROJECT_STATUSES.length}`} />
                      <span className="flex justify-between text-caption text-ink-muted">
                        <span>PM {p.pm?.profile?.full_name ?? p.pm?.username ?? "-"}</span>
                        <span className="tabular">{p.total_mandays} mandays</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {role === "pentester" || role === "technical_writer" ? (
        <p className="flex items-center gap-2 text-body-sm text-ink-muted">
          {role === "pentester" ? <Bug className="size-4" aria-hidden /> : <ClipboardCheck className="size-4" aria-hidden />}
          Buka sebuah proyek untuk {role === "pentester" ? "mencatat temuan" : "mengoreksi temuan dan membuat laporan"}.
        </p>
      ) : null}
    </div>
  );
}
