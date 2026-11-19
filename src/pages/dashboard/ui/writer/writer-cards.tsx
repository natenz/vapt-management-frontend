import { ArrowRight, BarChart3, ClipboardCheck } from "lucide-react";
import { Link } from "react-router";
import { SeverityChip } from "@/entities/finding";
import { ProjectStatusBadge } from "@/entities/project";
import { SEVERITIES } from "@/shared/api/schemas";
import { cn } from "@/shared/lib/cn";
import { toSeverityKey } from "@/shared/lib/format";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { StackedBarChart } from "@/shared/ui/charts";
import {
  QUALITY_LABEL,
  type FindingVolume,
  type ProjectQuality,
  type QualityIssue,
} from "../../model/writer-metrics";
import { CardEmpty, CardSkeleton } from "../superadmin/card-states";

const SEVERITY_BAR: Record<string, string> = {
  Critical: "bg-sev-critical-bg",
  High: "bg-sev-high-fg",
  Medium: "bg-sev-medium-fg",
  Low: "bg-sev-low-fg",
  Informational: "bg-sev-info-fg",
};

function PartialNote({ failed }: { failed: number }) {
  return failed > 0 ? (
    <p className="mt-3 text-caption text-warning">{failed} laporan proyek belum termuat; angka bisa kurang.</p>
  ) : null;
}

export function QualityCard({
  rows,
  isLoading,
  failed,
}: {
  rows: ProjectQuality[];
  isLoading: boolean;
  failed: number;
}) {
  const incomplete = rows.reduce((s, r) => s + r.incomplete.length, 0);
  return (
    <BentoCard
      colSpan={12}
      role="region"
      aria-label="Kelengkapan Temuan"
      title="Kelengkapan Temuan"
      description={
        incomplete > 0
          ? `${incomplete} temuan belum lengkap datanya. Minta pentester melengkapi sebelum laporan disusun.`
          : "Temuan di proyek yang akan dilaporkan sudah lengkap bukti, CVSS, dan endpoint."
      }
      icon={<ClipboardCheck />}
    >
      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <CardEmpty>Belum ada proyek di tahap Analysis atau laporan.</CardEmpty>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((r) => {
            const pct = r.total ? Math.round((r.complete / r.total) * 100) : 100;
            return (
              <li key={r.project.project_id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-title-sm font-normal text-ink">{r.project.project_name}</span>
                    <ProjectStatusBadge name={r.project.status?.status_name} />
                  </span>
                  <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto shrink-0 p-0 text-xs">
                    <Link to={`/projects/${r.project.project_id}/report`}>Buka laporan</Link>
                  </Button>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label={`Temuan lengkap ${pct}%`}
                  >
                    <span
                      className={cn("block h-full rounded-full", pct === 100 ? "bg-success" : "bg-warning")}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-caption text-ink-secondary tabular-nums">
                    {r.complete}/{r.total} lengkap
                  </span>
                </div>

                {r.incomplete.length > 0 ? (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(Object.keys(r.missing) as QualityIssue[])
                        .filter((k) => r.missing[k] > 0)
                        .map((k) => (
                          <span
                            key={k}
                            className="rounded-sm bg-warning-bg px-1.5 py-0.5 text-badge text-warning tabular-nums"
                          >
                            {QUALITY_LABEL[k]}: {r.missing[k]}
                          </span>
                        ))}
                    </div>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {r.incomplete.slice(0, 3).map(({ finding: f, issues }) => (
                        <li key={f.vulna_id} className="flex items-center justify-between gap-3 text-body-sm">
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-ink">
                              {f.finding_code ? <span className="text-ink-muted tabular">{f.finding_code} · </span> : null}
                              {f.custom_title}
                            </span>
                            <span className="text-caption text-ink-muted">
                              {issues.map((i) => QUALITY_LABEL[i]).join(" · ")}
                            </span>
                          </span>
                          <SeverityChip severity={toSeverityKey(f.severity)} />
                        </li>
                      ))}
                      {r.incomplete.length > 3 ? (
                        <li className="text-caption text-ink-muted">+{r.incomplete.length - 3} temuan lain</li>
                      ) : null}
                    </ul>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <PartialNote failed={failed} />
    </BentoCard>
  );
}

export function VolumeCard({
  rows,
  isLoading,
  failed,
}: {
  rows: FindingVolume[];
  isLoading: boolean;
  failed: number;
}) {
  return (
    <BentoCard
      colSpan={5}
      role="region"
      aria-label="Volume Temuan"
      title="Volume Temuan"
      description="Jumlah temuan per proyek untuk memperkirakan beban penulisan."
      icon={<BarChart3 />}
    >
      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <CardEmpty>Belum ada proyek yang memiliki temuan.</CardEmpty>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted" aria-label="Legenda severity">
            {SEVERITIES.map((s) => (
              <li key={s} className="inline-flex items-center gap-1">
                <span aria-hidden className={cn("size-2 rounded-xs", SEVERITY_BAR[s])} />
                {s === "Informational" ? "Info" : s}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-2.5">
            {rows.map((r) => (
              <li key={r.project.project_id} className="flex flex-col gap-1">
                <span className="flex items-center justify-between gap-2 text-body-sm">
                  <Link
                    to={`/projects/${r.project.project_id}`}
                    className="truncate rounded-xs text-ink focus-ring hover:text-brand"
                  >
                    {r.project.project_name}
                  </Link>
                  <span className="shrink-0 text-caption text-ink-secondary tabular-nums">{r.total} temuan</span>
                </span>
                <StackedBarChart
                  items={SEVERITIES.map((s) => ({ label: s, count: r.bySeverity[s], colorClass: SEVERITY_BAR[s]! }))}
                  height={8}
                  showLabels={false}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
      <PartialNote failed={failed} />
    </BentoCard>
  );
}
