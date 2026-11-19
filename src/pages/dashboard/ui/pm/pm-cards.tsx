import { CheckCircle2, Circle, Rocket, Wrench } from "lucide-react";
import { Link } from "react-router";
import { ProjectStatusBadge } from "@/entities/project";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { BentoCard } from "@/shared/ui/bento-grid";
import { StackedBarChart } from "@/shared/ui/charts";
import type { AssessmentReadiness, RemediationRow } from "../../model/pm-metrics";
import { CardEmpty, CardSkeleton } from "../superadmin/card-states";

const startText = (d: number | null) =>
  d === null ? "Tanggal mulai belum ada" : d > 0 ? `${d} hari lagi` : d === 0 ? "Hari ini" : `Lewat ${-d} hari`;

export function AssessmentReadinessCard({ rows, isLoading }: { rows: AssessmentReadiness[]; isLoading: boolean }) {
  const ready = rows.filter((r) => r.ready).length;
  return (
    <BentoCard
      colSpan={4}
      role="region"
      aria-label="Kesiapan Assessment"
      title="Kesiapan Assessment"
      description={
        rows.length
          ? `${ready} dari ${rows.length} proyek Scoping siap masuk Assessment.`
          : "Proyek Scoping dan syarat masuk Assessment."
      }
      icon={<Rocket />}
    >
      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <CardEmpty>Tidak ada proyek di tahap Scoping.</CardEmpty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ project: p, startDate, startsIn, checklist, ready: ok }) => {
            const done = checklist.filter((c) => c.done).length;
            return (
              <li key={p.project_id} className="rounded-md border border-border p-3">
                <Link
                  to={`/projects/${p.project_id}`}
                  className="flex min-w-0 flex-col rounded-xs focus-ring hover:text-brand"
                >
                  <span className="truncate text-title-sm font-normal text-ink">{p.project_name}</span>
                  <span className="text-caption text-ink-muted tabular">
                    Assessment {fmtDate(startDate)} ·{" "}
                    <span className={cn(!ok && startsIn !== null && startsIn <= 3 ? "text-warning" : undefined)}>
                      {startText(startsIn)}
                    </span>
                  </span>
                </Link>
                <ul className="mt-2 flex flex-col gap-1" aria-label={`Syarat Assessment ${done} dari ${checklist.length}`}>
                  {checklist.map((c) => (
                    <li key={c.label} className="flex items-center gap-1.5 text-caption">
                      {c.done ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-hidden />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
                      )}
                      <span className={c.done ? "text-ink" : "text-ink-muted"}>
                        {c.label}
                        <span className="sr-only">{c.done ? " (siap)" : " (belum)"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </BentoCard>
  );
}

const STATUS_BAR = [
  { key: "open", label: "Terbuka", color: "bg-error" },
  { key: "remediated", label: "Diperbaiki", color: "bg-info" },
  { key: "closed", label: "Ditutup", color: "bg-success" },
] as const;

export function RemediationCard({
  rows,
  isLoading,
  failed,
}: {
  rows: RemediationRow[];
  isLoading: boolean;
  failed: number;
}) {
  return (
    <BentoCard
      colSpan={5}
      role="region"
      aria-label="Progres Remediasi"
      title="Progres Remediasi"
      description="Penanganan temuan oleh klien, dasar keputusan mulai atau menutup Retesting."
      icon={<Wrench />}
    >
      {isLoading ? (
        <CardSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <CardEmpty>Tidak ada proyek di tahap Remediasi atau Retesting.</CardEmpty>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted" aria-label="Legenda status temuan">
            {STATUS_BAR.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1">
                <span aria-hidden className={cn("size-2 rounded-xs", s.color)} />
                {s.label}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-3">
            {rows.map(({ project: p, progress, handled, hint }) => (
              <li key={p.project_id} className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between gap-2">
                  <Link
                    to={`/projects/${p.project_id}`}
                    className="min-w-0 truncate rounded-xs text-body-sm text-ink focus-ring hover:text-brand"
                  >
                    {p.project_name}
                  </Link>
                  <ProjectStatusBadge name={p.status?.status_name} />
                </span>
                <StackedBarChart
                  items={STATUS_BAR.map((s) => ({ label: s.label, count: progress[s.key], colorClass: s.color }))}
                  height={8}
                  showLabels={false}
                />
                <span className="text-caption text-ink-muted tabular-nums">
                  {handled}% ditangani · {progress.open} terbuka · {progress.remediated} diperbaiki · {progress.closed} ditutup
                </span>
                {hint ? <span className="text-caption text-success">{hint}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
      {failed > 0 ? (
        <p className="mt-3 text-caption text-warning">{failed} laporan proyek belum termuat; angka bisa kurang.</p>
      ) : null}
    </BentoCard>
  );
}
