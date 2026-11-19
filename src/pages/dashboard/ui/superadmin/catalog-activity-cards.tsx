import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Activity,
  ArrowRight,
  BookCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FolderPlus,
  Users,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import type { CatalogVulna } from "@/entities/catalog";
import { SeverityChip } from "@/entities/finding";
import { ProjectStatusBadge } from "@/entities/project";
import { toSeverityKey } from "@/shared/lib/format";
import { StatusChip } from "@/shared/ui/badge";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import type { ActivityItem, catalogStats } from "../../model/superadmin-metrics";
import { CardEmpty, CardError, CardSkeleton } from "./card-states";

export function CatalogCard({
  stats,
  queue,
  isLoading,
  error,
}: {
  stats: ReturnType<typeof catalogStats>;
  queue: readonly CatalogVulna[];
  isLoading: boolean;
  error: unknown;
}) {
  return (
    <BentoCard
      colSpan={4}
      role="region"
      aria-label="Vulnerability Catalog"
      title="Vulnerability Catalog"
      description={
        stats.approvalRate === null
          ? "Belum ada pengajuan yang ditinjau."
          : `${stats.approvalRate}% pengajuan yang ditinjau disetujui.`
      }
      icon={<BookCheck />}
      action={
        <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
          <Link to={stats.pending > 0 ? "/catalog?status=pending" : "/catalog"}>Catalog</Link>
        </Button>
      }
    >
      {error ? (
        <CardError title="Gagal memuat catalog" error={error} />
      ) : isLoading ? (
        <CardSkeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-3 gap-2">
            {[
              { label: "Disetujui", value: stats.approved, chip: <StatusChip tone="success" icon={<CheckCircle2 />}>Disetujui</StatusChip> },
              { label: "Menunggu", value: stats.pending, chip: <StatusChip tone="warning" icon={<Clock />}>Menunggu</StatusChip> },
              { label: "Ditolak", value: stats.rejected, chip: <StatusChip tone="error" icon={<XCircle />}>Ditolak</StatusChip> },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1.5 rounded-md bg-surface-subtle p-2.5">
                <dt>{s.chip}</dt>
                <dd className="text-title-md text-ink tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink-muted">Antrean ACC terbaru</span>
            {queue.length === 0 ? (
              <CardEmpty>Tidak ada pengajuan menunggu ACC.</CardEmpty>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {queue.slice(0, 3).map((c) => (
                  <li key={c.vulna_id} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-xs text-ink">{c.title}</span>
                      <span className="truncate text-caption text-ink-muted">
                        {c.creator?.profile?.full_name ?? c.creator?.username ?? "-"}
                      </span>
                    </span>
                    <SeverityChip severity={toSeverityKey(c.severity)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </BentoCard>
  );
}

export function ActivityCard({
  items,
  isLoading,
  failed,
}: {
  items: ActivityItem[];
  isLoading: boolean;
  failed: number;
}) {
  return (
    <BentoCard
      colSpan={5}
      role="region"
      aria-label="Aktivitas Terbaru"
      title="Aktivitas Terbaru"
      description="Perpindahan stage proyek paling baru."
      icon={<Activity />}
    >
      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : items.length === 0 ? (
        <CardEmpty>Belum ada perubahan status yang tercatat.</CardEmpty>
      ) : (
        <ol className="relative flex flex-col gap-3 border-l border-border pl-4">
          {items.map((a) => (
            <li key={a.id} className="relative flex flex-col gap-1">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-surface bg-brand"
              />
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  to={`/projects/${a.project.project_id}`}
                  className="truncate rounded-xs text-xs text-ink focus-ring hover:text-brand"
                >
                  {a.project.project_name}
                </Link>
                <span className="text-caption text-ink-muted">masuk stage</span>
                <ProjectStatusBadge name={a.status} />
              </span>
              <time dateTime={a.at} className="text-caption text-ink-muted">
                {formatDistanceToNow(new Date(a.at), { addSuffix: true, locale: idLocale })}
              </time>
            </li>
          ))}
        </ol>
      )}
      {failed > 0 ? (
        <p className="mt-3 text-caption text-warning">Riwayat {failed} proyek belum termuat.</p>
      ) : null}
    </BentoCard>
  );
}

const SHORTCUTS: { to: string; title: string; text: string; icon: ReactNode; tone: string }[] = [
  {
    to: "/users",
    title: "Manajemen Pengguna",
    text: "Kelola akun, role, dan departemen.",
    icon: <Users />,
    tone: "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  },
  {
    to: "/projects/new",
    title: "Buat Proyek",
    text: "Bikin template proyek VAPT baru.",
    icon: <FolderPlus />,
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  {
    to: "/catalog",
    title: "Vulnerability Catalog",
    text: "Kelola daftar vulnerability dan ACC pengajuan.",
    icon: <BookCheck />,
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  {
    to: "/reports",
    title: "Koreksi & Report",
    text: "Pantau report proyek yang berjalan.",
    icon: <ClipboardCheck />,
    tone: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
  },
];

export function ShortcutsCard() {
  return (
    <BentoCard
      colSpan={8}
      role="region"
      aria-label="Pintasan Administrasi"
      title="Pintasan Tata Kelola"
      description="Jalan pintas ke menu admin."
      icon={<ArrowRight />}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-surface-subtle focus-ring"
          >
            <span
              aria-hidden
              className={`flex size-8 shrink-0 items-center justify-center rounded-sm [&_svg]:size-4 ${s.tone}`}
            >
              {s.icon}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-title-sm text-ink group-hover:text-brand">{s.title}</span>
              <span className="text-caption text-ink-muted">{s.text}</span>
            </span>
          </Link>
        ))}
      </div>
    </BentoCard>
  );
}
