import { useQueries, useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Bug,
  FileText,
  Clock,
  FolderKanban,
  Plus,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router";
import { listCatalog } from "@/entities/catalog";
import { getExposure, listFindings } from "@/entities/finding";
import {
  currentMonth,
  getResourceLoad,
  listActiveProjectDetails,
  listAllProjects,
  ProjectStatusBadge,
  type Project,
} from "@/entities/project";
import { useSession } from "@/entities/session";
import { listUsers } from "@/entities/user";
import { ROLE_LABEL, isRole } from "@/shared/config/roles";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { PentesterDashboard } from "./pentester-dashboard";
import { PmDashboard } from "./pm-dashboard";
import { SuperAdminDashboard } from "./superadmin-dashboard";
import { TechLeadDashboard } from "./techlead-dashboard";
import { WriterDashboard } from "./writer-dashboard";

// Batas proyek per role ditegakkan BE (service/access.go roleStatuses). Di sini hanya dipilah:
// "giliran" = status yang menunggu tindakan role ini; sisanya proyek berjalan yang cukup dipantau.
type RoleView = { turn: string[]; turnHint: string; next: Record<string, string> };

const RUNNING: Record<string, string> = {
  Scoping: "Konfirmasi scope dengan klien",
  Assessment: "Pentester sedang menguji",
  Analysis: "Analisis dan validasi findings",
  "Initial Report": "Tech Writer menyusun Initial Report",
  Remediasi: "Klien memperbaiki findings",
  Retesting: "Pentester menguji ulang",
  "Final Report Drafting": "Tech Writer menyusun Final Report",
  "Final Presentation": "Presentasi hasil ke klien",
};

const VIEWS: Record<string, RoleView> = {
  tech_lead: {
    turn: ["Draft"],
    turnHint: "Template yang perlu dilengkapi lalu diserahkan ke PM.",
    next: { ...RUNNING, Draft: "Lengkapi template lalu kickoff ke PM", Scoping: "PM menyiapkan asset dan pentester" },
  },
};
VIEWS.super_admin = VIEWS.tech_lead!;

const OPEN = ["open"];

function deadline(end?: string | null, today = new Date()) {
  if (!end) return { text: "-", tone: "" };
  const days = differenceInCalendarDays(startOfDay(new Date(end)), startOfDay(today));
  if (days < 0) return { text: `Lewat ${-days} hari`, tone: "text-error" };
  if (days === 0) return { text: "Hari ini", tone: "text-warning" };
  return { text: `${days} hari lagi`, tone: days <= 3 ? "text-warning" : "" };
}

function ProjectTable({ rows, next, openCount }: { rows: Project[]; next: Record<string, string>; openCount: Map<number, number> }) {
  return (
    <Table boxed>
      <TableHeader>
        <TableRow>
          <TableHead>
            <span className="inline-flex items-center gap-1.5 font-normal normal-case">
              <FolderKanban className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              <span>Proyek</span>
            </span>
          </TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1.5 font-normal normal-case">
              <ShieldAlert className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              <span>Stage</span>
            </span>
          </TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1.5 font-normal normal-case">
              <ArrowRight className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              <span>Langkah berikutnya</span>
            </span>
          </TableHead>
          <TableHead>
            <span className="inline-flex items-center gap-1.5 font-normal normal-case">
              <Clock className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              <span>Tenggat</span>
            </span>
          </TableHead>
          <TableHead numeric>
            <span className="inline-flex items-center gap-1.5 font-normal normal-case">
              <Bug className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              <span>Findings terbuka</span>
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => {
          const status = p.status?.status_name ?? "";
          const due = deadline(p.end_date);
          return (
            <TableRow key={p.project_id}>
              <TableCell>
                <Link to={`/projects/${p.project_id}`} className="flex flex-col focus-ring hover:text-brand">
                  <span className="text-title-sm font-normal text-ink">{p.project_name}</span>
                  <span className="text-caption text-ink-muted">{p.client_name} · PM {p.pm?.profile?.full_name ?? p.pm?.username ?? "-"}</span>
                </Link>
              </TableCell>
              <TableCell>
                <ProjectStatusBadge name={status} />
              </TableCell>
              <TableCell className="text-body-sm text-ink">{next[status] ?? "-"}</TableCell>
              <TableCell>
                <span className="flex flex-col">
                  <span className="text-body-sm text-ink tabular">{fmtDate(p.end_date)}</span>
                  <span className={cn("text-caption text-ink-muted", due.tone)}>{due.text}</span>
                </span>
              </TableCell>
              <TableCell numeric>{openCount.get(p.project_id) ?? "-"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function DashboardPage() {
  const user = useSession((s) => s.user);
  const role = user?.role?.role_name ?? "";
  const view = VIEWS[role] ?? VIEWS.tech_lead!;
  // Key sama dengan halaman /projects (listAllProjects menangani paging BE > 100 proyek)
  const projects = useQuery({ queryKey: ["projects", "all"], queryFn: listAllProjects });

  const active = (projects.data?.data ?? [])
    .filter((p) => p.status?.status_name !== "Done")
    .sort((a, b) => (a.end_date ?? "9999").localeCompare(b.end_date ?? "9999"));
  const turn = active.filter((p) => view.turn.includes(p.status?.status_name ?? ""));
  const watch = active.filter((p) => !view.turn.includes(p.status?.status_name ?? ""));

  const isSuperAdmin = role === "super_admin";
  const isTechLead = role === "tech_lead";
  const isTlView = isTechLead || isSuperAdmin;
  const isPentester = role === "pentester";
  const isWriter = role === "technical_writer";
  const isPm = role === "project_manager";

  // Data tambahan Tech Lead. Super Admin mengambil datanya sendiri lewat useSuperAdminData.
  const users = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => listUsers(),
    enabled: isTechLead,
  });
  const load = useQuery({
    queryKey: ["workload", "detail", currentMonth()],
    queryFn: () => getResourceLoad(currentMonth()),
    enabled: isTechLead,
  });

  const withFindings = isTlView || isPentester || isWriter || isPm ? [] : active.filter((p) => !["Draft", "Scoping"].includes(p.status?.status_name ?? "")).slice(0, 20);
  const findings = useQueries({
    queries: withFindings.map((p) => ({ queryKey: ["findings", p.project_id], queryFn: () => listFindings(p.project_id) })),
  });
  const openCount = new Map<number, number>();
  withFindings.forEach((p, i) => {
    const list = findings[i]?.data;
    if (!list) return;
    openCount.set(p.project_id, list.filter((f) => OPEN.includes(f.status)).length);
  });
  const name = user?.profile?.full_name ?? user?.username ?? "";

  // Tech Lead: detail proyek (penugasan mandays) untuk tabel penugasan mingguan.
  // Key sama dengan linimasa di /resources sehingga cache terpakai bersama.
  const details = useQuery({
    queryKey: ["projects", "active-details", currentMonth()],
    queryFn: () => listActiveProjectDetails(currentMonth()),
    enabled: isTechLead,
  });
  const approved = useQuery({
    queryKey: ["catalog", "approved"],
    queryFn: () => listCatalog({ status: "approved" }),
    enabled: isTechLead,
  });

  // Tech Lead: data antrean katalog
  const pending = useQuery({
    queryKey: ["catalog", "pending"],
    queryFn: () => listCatalog({ status: "pending" }),
    enabled: isTechLead,
  });
  const pendingRows = [...(pending.data ?? [])].sort((a, b) => b.vulna_id - a.vulna_id);

  // Tech Lead: temuan Open lintas proyek, dihitung BE.
  const exposure = useQuery({
    queryKey: ["exposure"],
    queryFn: getExposure,
    enabled: isTechLead,
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description={`Halo ${name}${isRole(role) ? ` (${ROLE_LABEL[role]})` : ""}.`}
        action={
          isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" leadingIcon={<UserPlus />}>
                <Link to="/users">Tambah Pengguna</Link>
              </Button>
              <Button asChild variant="solid" leadingIcon={<Plus />}>
                <Link to="/projects/new">Buat Proyek</Link>
              </Button>
            </div>
          ) : isTechLead ? (
            <Button asChild variant="solid" leadingIcon={<Plus />}>
              <Link to="/projects/new">Buat Template Proyek</Link>
            </Button>
          ) : isPentester || isWriter || isPm ? (
            <div className="flex items-center gap-2">
              {isPentester ? (
                <Button asChild variant="outline" leadingIcon={<BookOpen />}>
                  <Link to="/catalog">Vulnerability Catalog</Link>
                </Button>
              ) : (
                <Button asChild variant="outline" leadingIcon={<FileText />}>
                  <Link to="/reports">Report</Link>
                </Button>
              )}
              <Button asChild variant="solid" leadingIcon={<FolderKanban />}>
                <Link to="/projects">{isPm ? "Projects" : "Proyek Saya"}</Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {projects.error ? <Alert tone="error" title="Gagal memuat proyek">{projects.error.message}</Alert> : null}

      {isSuperAdmin ? (
        <SuperAdminDashboard projects={projects.data?.data ?? []} isLoading={projects.isLoading} />
      ) : isTechLead ? (
        <TechLeadDashboard
          projects={projects.data?.data ?? []}
          users={users.data ?? []}
          catalogQueue={pendingRows}
          loadMap={load.data ?? {}}
          isLoading={projects.isLoading || users.isLoading || load.isLoading}
          details={details.data ?? []}
          detailsLoading={details.isLoading}
          detailsError={details.error}
          approvedCount={approved.data ? approved.data.length : null}
          exposure={exposure.data}
          exposureLoading={exposure.isLoading}
          exposureError={exposure.error}
        />
      ) : isPentester ? (
        <PentesterDashboard
          projects={projects.data?.data ?? []}
          sysUserId={user?.sys_user_id ?? 0}
          isLoading={projects.isLoading}
        />
      ) : isPm ? (
        <PmDashboard projects={projects.data?.data ?? []} isLoading={projects.isLoading} />
      ) : isWriter ? (
        <WriterDashboard projects={projects.data?.data ?? []} isLoading={projects.isLoading} />
      ) : projects.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <section className="flex flex-col gap-3" aria-label="Giliran Anda">
            <div>
              <h2 className="text-title-md text-ink">Giliran Anda <span className="text-body-sm text-ink-muted">({turn.length})</span></h2>
              <p className="text-body-sm text-ink-muted">{view.turnHint}</p>
            </div>
            {turn.length ? (
              <ProjectTable rows={turn} next={view.next} openCount={openCount} />
            ) : (
              <EmptyState icon={<FolderKanban />} title="Tidak ada yang menunggu Anda" description="Proyek akan muncul di sini saat tiba giliran Anda." />
            )}
          </section>

          {watch.length ? (
            <section className="flex flex-col gap-3" aria-label="Sedang berjalan">
              <div>
                <h2 className="text-title-md text-ink">Sedang berjalan <span className="text-body-sm text-ink-muted">({watch.length})</span></h2>
                <p className="text-body-sm text-ink-muted">Proyek Anda yang sedang dikerjakan role lain. Cukup dipantau.</p>
              </div>
              <ProjectTable rows={watch} next={view.next} openCount={openCount} />
            </section>
          ) : null}

          <Button asChild variant="link" trailingIcon={<ArrowRight />} className="self-start">
            <Link to="/projects">Semua proyek</Link>
          </Button>
        </>
      )}
    </div>
  );
}
