import { CheckCircle2, CircleDot, FolderKanban, ShieldAlert, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { SeverityChip } from "@/entities/finding";
import { ProjectStatusBadge } from "@/entities/project";
import { toSeverityKey } from "@/shared/lib/format";
import { StatusChip } from "@/shared/ui/badge";
import { BentoCard } from "@/shared/ui/bento-grid";
import { DonutChart, StackedBarChart } from "@/shared/ui/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
  FINDING_STATUS_ORDER,
  type FindingStatusKey,
  type FindingTotals,
  type RiskRow,
} from "../../model/superadmin-metrics";
import { CardEmpty, CardSkeleton, ColumnLabel } from "./card-states";

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "var(--color-sev-critical-bg)",
  High: "var(--color-sev-high-fg)",
  Medium: "var(--color-sev-medium-fg)",
  Low: "var(--color-sev-low-fg)",
  Informational: "var(--color-sev-info-fg)",
};

const STATUS_META: Record<
  FindingStatusKey,
  { label: string; tone: "error" | "warning" | "info" | "success"; bar: string; icon: ReactNode }
> = {
  open: { label: "Open", tone: "error", bar: "bg-error", icon: <CircleDot /> },
  closed: { label: "Closed", tone: "success", bar: "bg-success", icon: <CheckCircle2 /> },
};

/** Keterangan sebagian report gagal dimuat — angka tetap tampil dari yang berhasil. */
function PartialNote({ failed }: { failed: number }) {
  return failed > 0 ? (
    <p className="mt-3 text-caption text-warning">{failed} proyek belum termuat; angka bisa kurang.</p>
  ) : null;
}

export function SeverityCard({
  totals,
  isLoading,
  failed,
  colSpan = 4,
}: {
  totals: FindingTotals;
  isLoading: boolean;
  failed: number;
  colSpan?: 4 | 5;
}) {
  const segments = Object.entries(totals.openBySeverity).map(([label, value]) => ({
    id: label,
    label: label === "Informational" ? "Info" : label,
    value,
    color: SEVERITY_COLOR[label] ?? "var(--color-ink-muted)",
  }));
  const hasOpen = totals.open > 0;
  return (
    <BentoCard
      colSpan={colSpan}
      role="region"
      aria-label="Severity Findings Terbuka"
      title="Severity Findings Terbuka"
      description="Seluruh proyek, findings yang masih Open."
      icon={<ShieldAlert />}
    >
      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : (
        <>
          <DonutChart
            segments={
              hasOpen
                ? segments
                : [{ label: "Tidak ada findings terbuka", value: 1, color: "var(--color-surface-subtle)" }]
            }
            centerValue={totals.open}
            centerLabel="terbuka"
            size={150}
            showLegend
          />
          <PartialNote failed={failed} />
        </>
      )}
    </BentoCard>
  );
}

export function FindingStatusCard({
  totals,
  isLoading,
  failed,
}: {
  totals: FindingTotals;
  isLoading: boolean;
  failed: number;
}) {
  const closedRate = totals.total === 0 ? 0 : Math.round((totals.byStatus.closed / totals.total) * 100);
  return (
    <BentoCard
      colSpan={4}
      role="region"
      aria-label="Status Penanganan Findings"
      title="Status Penanganan"
      description="Berapa findings yang sudah Closed."
      icon={<Wrench />}
      action={
        <Link to="/reports" className="rounded-xs text-xs text-brand focus-ring hover:underline">
          Report
        </Link>
      }
    >
      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : totals.total === 0 ? (
        <CardEmpty>Belum ada findings tercatat.</CardEmpty>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-title-lg text-ink tabular-nums">{closedRate}%</span>
            <span className="text-xs text-ink-muted">dari {totals.total} findings sudah Closed</span>
          </div>
          <StackedBarChart
            items={FINDING_STATUS_ORDER.map((s) => ({
              label: STATUS_META[s].label,
              count: totals.byStatus[s],
              colorClass: STATUS_META[s].bar,
            }))}
            height={8}
            showLabels={false}
          />
          <ul className="grid grid-cols-2 gap-2">
            {FINDING_STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center justify-between gap-2">
                <StatusChip tone={STATUS_META[s].tone} icon={STATUS_META[s].icon}>
                  {STATUS_META[s].label}
                </StatusChip>
                <span className="text-xs text-ink tabular-nums">{totals.byStatus[s]}</span>
              </li>
            ))}
          </ul>
          <PartialNote failed={failed} />
        </div>
      )}
    </BentoCard>
  );
}

export function RiskiestProjectsCard({
  rows,
  isLoading,
  failed,
}: {
  rows: RiskRow[];
  isLoading: boolean;
  failed: number;
}) {
  return (
    <BentoCard
      colSpan={7}
      role="region"
      aria-label="Proyek Paling Berisiko"
      title="Proyek Paling Berisiko"
      description="Urut berdasarkan findings Critical lalu High yang belum ditutup."
      icon={<ShieldAlert />}
    >
      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <CardEmpty>Tidak ada proyek dengan findings terbuka.</CardEmpty>
      ) : (
        <div className="overflow-x-auto">
          <Table boxed>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <ColumnLabel icon={<FolderKanban />}>Proyek</ColumnLabel>
                </TableHead>
                <TableHead>
                  <ColumnLabel icon={<CircleDot />}>Stage</ColumnLabel>
                </TableHead>
                <TableHead>
                  <ColumnLabel icon={<ShieldAlert />}>Terberat</ColumnLabel>
                </TableHead>
                <TableHead numeric>
                  <ColumnLabel icon={<CircleDot />}>Terbuka</ColumnLabel>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.project.project_id}>
                  <TableCell>
                    <Link
                      to={`/projects/${r.project.project_id}/report`}
                      className="flex flex-col rounded-xs focus-ring hover:text-brand"
                    >
                      <span className="text-title-sm font-normal text-ink">{r.project.project_name}</span>
                      <span className="text-caption text-ink-muted">{r.project.client_name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ProjectStatusBadge name={r.project.status?.status_name} />
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col gap-1">
                      {r.critical > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <SeverityChip severity={toSeverityKey("Critical")} />
                          <span className="text-xs text-ink-muted tabular-nums">×{r.critical}</span>
                        </span>
                      ) : null}
                      {r.high > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <SeverityChip severity={toSeverityKey("High")} />
                          <span className="text-xs text-ink-muted tabular-nums">×{r.high}</span>
                        </span>
                      ) : null}
                      {r.critical === 0 && r.high === 0 ? (
                        <span className="text-xs text-ink-muted">Medium ke bawah</span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell numeric>{r.open}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <PartialNote failed={failed} />
    </BentoCard>
  );
}
