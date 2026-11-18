import { useQueries, useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BookCheck,
  Bug,
  CalendarRange,
  Clock,
  FolderKanban,
  Plus,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import { Link } from "react-router";
import { listCatalog, type CatalogVulna } from "@/entities/catalog";
import { listFindings, SeverityChip } from "@/entities/finding";
import { listProjects, ProjectStatusBadge, type Project } from "@/entities/project";
import { useSession } from "@/entities/session";
import { ROLE_LABEL, isRole } from "@/shared/config/roles";
import { cn } from "@/shared/lib/cn";
import { fmtDate, toSeverityKey } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

// Batas proyek per role ditegakkan BE (service/access.go roleStatuses). Di sini hanya dipilah:
// "giliran" = status yang menunggu tindakan role ini; sisanya proyek berjalan yang cukup dipantau.
type RoleView = { turn: string[]; turnHint: string; next: Record<string, string> };

const RUNNING: Record<string, string> = {
  Scoping: "Konfirmasi scope dengan klien",
  Assessment: "Pentester sedang menguji",
  Analysis: "Analisis dan validasi temuan",
  "Initial Report": "Tech Writer menyusun Initial Report",
  Remediasi: "Klien memperbaiki temuan",
  Retesting: "Pentester menguji ulang",
  "Final Report Drafting": "Tech Writer menyusun Final Report",
  "Final Presentation": "Presentasi hasil ke klien",
};

const VIEWS: Record<string, RoleView> = {
  pentester: {
    turn: ["Assessment", "Analysis", "Retesting"],
    turnHint: "Proyek yang sedang Anda uji, analisis, atau uji ulang.",
    next: { ...RUNNING, Assessment: "Uji aset dan catat temuan", Analysis: "Validasi dan lengkapi temuan", Retesting: "Uji ulang temuan yang diperbaiki" },
  },
  technical_writer: {
    turn: ["Initial Report", "Final Report Drafting", "Final Presentation"],
    turnHint: "Proyek yang laporannya perlu Anda susun atau presentasikan.",
    next: { ...RUNNING, "Initial Report": "Koreksi temuan dan susun Initial Report", "Final Report Drafting": "Susun Final Report", "Final Presentation": "Presentasikan hasil ke klien" },
  },
  project_manager: {
    turn: ["Planning", "Remediasi", "Retesting"],
    turnHint: "Proyek Anda yang perlu disiapkan, atau menunggu keputusan Anda di Remediasi/Retesting.",
    next: {
      ...RUNNING,
      Planning: "Isi aset, assign tim, lalu kickoff",
      Remediasi: "Mulai Retesting setelah klien selesai",
      Retesting: "Tutup Retesting atau kembalikan ke Remediasi",
    },
  },
  tech_lead: {
    turn: ["Draft"],
    turnHint: "Template yang perlu dilengkapi lalu diserahkan ke PM.",
    next: { ...RUNNING, Draft: "Lengkapi template lalu serahkan ke PM", Planning: "PM menyiapkan aset dan tim" },
  },
};
VIEWS.super_admin = VIEWS.tech_lead!;

const OPEN = ["open", "reopened"];

function deadline(end?: string | null, today = new Date()) {
  if (!end) return { text: "-", tone: "" };
  const days = differenceInCalendarDays(startOfDay(new Date(end)), startOfDay(today));
  if (days < 0) return { text: `Lewat ${-days} hari`, tone: "text-error" };
  if (days === 0) return { text: "Hari ini", tone: "text-warning" };
  return { text: `${days} hari lagi`, tone: days <= 3 ? "text-warning" : "" };
}

const LATEST_COUNT = 5;

/** Proyek yang paling baru dibuat (project_id terbesar), status apa pun termasuk Draft dan Done. */
function LatestProjects({ rows, loading }: { rows: Project[]; loading: boolean }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Proyek terakhir">
      <h2 className="text-title-md text-ink">Proyek terakhir</h2>
      {loading ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FolderKanban />} title="Belum ada proyek" description="Proyek yang baru dibuat akan muncul di sini." />
      ) : (
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
                  <span>Tahap</span>
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5 font-normal normal-case">
                  <CalendarRange className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                  <span>Rentang tanggal</span>
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.project_id}>
                <TableCell>
                  <Link to={`/projects/${p.project_id}`} className="flex flex-col focus-ring hover:text-brand">
                    <span className="text-title-sm font-normal text-ink">{p.project_name}</span>
                    <span className="text-caption text-ink-muted">{p.client_name} · PM {p.pm?.profile?.full_name ?? p.pm?.username ?? "-"}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <ProjectStatusBadge name={p.status?.status_name ?? ""} />
                </TableCell>
                <TableCell className="text-body-sm text-ink tabular">{fmtDate(p.start_date)} s/d {fmtDate(p.end_date)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

/** Antrean ACC katalog. Pengajuan berstatus pending hanya datang dari pentester (BE catalogStatusForActor). */
function CatalogQueue({ rows, loading, error }: { rows: CatalogVulna[]; loading: boolean; error?: Error | null }) {
  return (
    <section className="flex flex-col gap-3" aria-label="ACC katalog dari pentest">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-title-md text-ink">
          ACC katalog dari pentest <span className="text-body-sm text-ink-muted">({rows.length})</span>
        </h2>
        <Button asChild variant="link" trailingIcon={<ArrowRight />}>
          <Link to="/catalog">{rows.length > 0 ? "Tinjau dan setujui" : "Buka katalog"}</Link>
        </Button>
      </div>
      {error ? (
        <Alert tone="error" title="Pengajuan belum bisa dimuat" compact>{error.message}</Alert>
      ) : loading ? (
        <Skeleton className="h-40" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<BookCheck />} title="Tidak ada pengajuan" description="Pengajuan kerentanan baru dari pentester akan muncul di sini untuk Anda setujui." />
      ) : (
        <Table boxed>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="inline-flex items-center gap-1.5 font-normal normal-case">
                  <ShieldAlert className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                  <span>Kerentanan</span>
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5 font-normal normal-case">
                  <AlertTriangle className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                  <span>Severity</span>
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1.5 font-normal normal-case">
                  <UserIcon className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                  <span>Diajukan oleh</span>
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.vulna_id}>
                <TableCell className="text-title-sm font-normal text-ink">{c.title}</TableCell>
                <TableCell>
                  <SeverityChip severity={toSeverityKey(c.severity)} />
                </TableCell>
                <TableCell className="text-body-sm text-ink-secondary">{c.creator?.profile?.full_name ?? c.creator?.username ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
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
              <span>Tahap</span>
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
              <span>Temuan terbuka</span>
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
  const projects = useQuery({ queryKey: ["projects", "all"], queryFn: () => listProjects({ limit: 100 }) });

  const active = (projects.data?.data ?? [])
    .filter((p) => p.status?.status_name !== "Done")
    .sort((a, b) => (a.end_date ?? "9999").localeCompare(b.end_date ?? "9999"));
  const turn = active.filter((p) => view.turn.includes(p.status?.status_name ?? ""));
  const watch = active.filter((p) => !view.turn.includes(p.status?.status_name ?? ""));

  // Temuan terbuka per proyek; cache ["findings", id] dipakai bersama panel temuan di detail proyek.
  // ponytail: satu request per proyek (maks 20); ganti ke ringkasan dari BE bila proyek aktif makin banyak.
  const isTlView = role === "tech_lead" || role === "super_admin";
  const withFindings = isTlView ? [] : active.filter((p) => !["Draft", "Planning", "Scoping"].includes(p.status?.status_name ?? "")).slice(0, 20);
  const findings = useQueries({
    queries: withFindings.map((p) => ({ queryKey: ["findings", p.project_id], queryFn: () => listFindings(p.project_id) })),
  });
  const openCount = new Map<number, number>();
  withFindings.forEach((p, i) => {
    const list = findings[i]?.data;
    if (!list) return;
    const mine = role === "pentester" ? list.filter((f) => f.pentester_id === user?.sys_user_id) : list;
    openCount.set(p.project_id, mine.filter((f) => OPEN.includes(f.status)).length);
  });
  const name = user?.profile?.full_name ?? user?.username ?? "";

  // Tech Lead / Super Admin: dashboard = 5 proyek terakhir + antrean ACC katalog, bukan tabel "giliran".
  const isTl = role === "tech_lead" || role === "super_admin";
  const pending = useQuery({ queryKey: ["catalog", "pending"], queryFn: () => listCatalog({ status: "pending" }), enabled: isTl });
  const latest = [...(projects.data?.data ?? [])].sort((a, b) => b.project_id - a.project_id).slice(0, LATEST_COUNT);
  const pendingRows = [...(pending.data ?? [])].sort((a, b) => b.vulna_id - a.vulna_id);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description={`Halo ${name}${isRole(role) ? ` (${ROLE_LABEL[role]})` : ""}.${isTl ? "" : " Hanya proyek yang menjadi bagian Anda yang ditampilkan."}`}
        action={
          role === "tech_lead" || role === "super_admin" ? (
            <Button asChild variant="solid" leadingIcon={<Plus />}>
              <Link to="/projects/new">Buat Project Template</Link>
            </Button>
          ) : undefined
        }
      />

      {projects.error ? <Alert tone="error" title="Gagal memuat proyek">{projects.error.message}</Alert> : null}

      {isTl ? (
        <>
          <CatalogQueue rows={pendingRows} loading={pending.isLoading} error={pending.error} />
          <LatestProjects rows={latest} loading={projects.isLoading} />
          <Button asChild variant="link" trailingIcon={<ArrowRight />} className="self-start">
            <Link to="/projects">Semua proyek</Link>
          </Button>
        </>
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
