import { ArrowRight, ListChecks } from "lucide-react";
import { Link } from "react-router";
import { ProjectStatusBadge } from "@/entities/project";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { BentoCard } from "@/shared/ui/bento-grid";
import { PM_NEXT_STEP, type PmItem } from "../../model/pm-metrics";
import { dueText } from "../pentester/priority-card";
import { CardEmpty, CardSkeleton } from "../superadmin/card-states";

/**
 * Proyek yang menunggu keputusan PM (Scoping, Remediasi, Retesting), tenggat
 * terdekat dulu. Versi ringkas agar muat di samping "Proyek Berjalan".
 */
export function PmActionCard({ rows, isLoading }: { rows: PmItem[]; isLoading: boolean }) {
  const mine = rows.filter((r) => r.myTurn);
  return (
    <BentoCard
      colSpan={5}
      scrollable
      role="region"
      aria-label="Perlu Tindakan Anda"
      title="Perlu Tindakan Anda"
      description={
        mine.length
          ? `${mine.length} proyek menunggu keputusan Anda, tenggat terdekat dulu.`
          : "Tidak ada proyek yang menunggu keputusan Anda."
      }
      icon={<ListChecks />}
    >
      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : mine.length === 0 ? (
        <CardEmpty>Semua proyek sedang dikerjakan role lain.</CardEmpty>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {mine.map((r, i) => {
            const due = dueText(r.days);
            return (
              <li key={r.project.project_id}>
                <Link
                  to={`/projects/${r.project.project_id}`}
                  className="group flex gap-3 rounded-md border border-border p-3 transition-colors hover:border-brand/40 hover:bg-surface-subtle focus-ring"
                >
                  <span className="text-caption text-ink-muted tabular-nums">{i + 1}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-title-sm font-normal text-ink group-hover:text-brand">
                        {r.project.project_name}
                      </span>
                      <ProjectStatusBadge name={r.status} />
                    </span>
                    <span className="text-body-sm text-ink-secondary">{PM_NEXT_STEP[r.status] ?? "-"}</span>
                    <span className="flex flex-wrap items-center justify-between gap-x-3 text-caption">
                      <span className="text-ink-muted">
                        {r.dateLabel} · <span className="tabular">{fmtDate(r.date)}</span>
                      </span>
                      <span className={cn("tabular-nums", due.tone)}>{due.text}</span>
                    </span>
                    {r.findings ? (
                      <span className="text-caption text-ink-muted tabular-nums">
                        {r.findings.total} temuan · {r.findings.open} terbuka · {r.findings.closed} ditutup
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-ink-muted group-hover:text-brand" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </BentoCard>
  );
}
