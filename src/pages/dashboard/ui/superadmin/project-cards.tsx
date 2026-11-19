import { ArrowRight, Building2, CalendarClock, FolderKanban, GitBranch, TrendingUp, UserRound } from "lucide-react";
import { Link } from "react-router";
import { ProjectStatusBadge, type Project } from "@/entities/project";
import { toUserProfileInfo } from "@/entities/user";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { AreaLineChart, StackedBarChart } from "@/shared/ui/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import type { FunnelStage, TrendPoint } from "../../model/superadmin-metrics";
import { CardEmpty, CardSkeleton, ColumnLabel } from "./card-states";

/* Rona batang funnel mengikuti chip status proyek (ProjectStatusBadge), versi pekat. */
const STAGE_BAR: Record<string, string> = {
  Draft: "bg-slate-400",
  Scoping: "bg-cyan-500",
  Assessment: "bg-amber-500",
  Analysis: "bg-indigo-500",
  "Initial Report": "bg-blue-500",
  Remediasi: "bg-rose-500",
  Retesting: "bg-purple-500",
  "Final Report Drafting": "bg-fuchsia-500",
  "Final Presentation": "bg-emerald-500",
  Done: "bg-green-500",
};

const linkAction = (to: string, label: string) => (
  <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
    <Link to={to}>{label}</Link>
  </Button>
);

export function ProjectTrendCard({ data, isLoading }: { data: TrendPoint[]; isLoading: boolean }) {
  const started = data.reduce((s, d) => s + d.started, 0);
  const completed = data.reduce((s, d) => s + d.completed, 0);
  return (
    <BentoCard
      colSpan={8}
      role="region"
      aria-label="Tren Proyek"
      title="Tren Proyek 12 Bulan"
      description="Proyek yang dimulai dibanding proyek yang selesai per bulan."
      icon={<TrendingUp />}
      action={linkAction("/projects", "Buka proyek")}
    >
      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="flex gap-6 text-xs">
            <div>
              <dt className="text-ink-muted">Dimulai</dt>
              <dd className="text-title-md text-ink tabular-nums">{started}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Selesai</dt>
              <dd className="text-title-md text-ink tabular-nums">{completed}</dd>
            </div>
          </dl>
          <AreaLineChart
            data={data.map((d) => ({ label: d.label, value: d.started, secondaryValue: d.completed }))}
            height={200}
            seriesName="Dimulai"
            secondarySeriesName="Selesai"
            valueUnit="proyek"
          />
        </div>
      )}
    </BentoCard>
  );
}

export function StageFunnelCard({
  stages,
  isLoading,
}: {
  stages: FunnelStage[];
  isLoading: boolean;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((s, x) => s + x.count, 0);
  return (
    <BentoCard
      colSpan={5}
      role="region"
      aria-label="Siklus Stage Proyek"
      title="Siklus 10 Stages"
      description={`${total} proyek tersebar dari Draft hingga Done.`}
      icon={<GitBranch />}
    >
      {isLoading ? (
        <CardSkeleton rows={6} />
      ) : (
        <div className="flex flex-col gap-3">
          <StackedBarChart
            items={stages.map((s) => ({
              label: s.name,
              count: s.count,
              colorClass: STAGE_BAR[s.name] ?? "bg-ink-muted",
            }))}
            height={8}
            showLabels={false}
          />
          <ul className="flex flex-col gap-1.5">
            {stages.map((s) => (
              <li key={s.name} className="grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-3">
                <ProjectStatusBadge name={s.name} />
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
                  <span
                    className={cn("block h-full rounded-full", STAGE_BAR[s.name] ?? "bg-ink-muted")}
                    style={{ width: `${(s.count / max) * 100}%` }}
                  />
                </span>
                <span className="text-right text-xs text-ink tabular-nums">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </BentoCard>
  );
}

export function DeadlineCard({
  rows,
  isLoading,
}: {
  rows: { project: Project; days: number }[];
  isLoading: boolean;
}) {
  return (
    <BentoCard
      colSpan={7}
      role="region"
      aria-label="Tenggat Terdekat"
      title="Tenggat Terdekat"
      description="Proyek aktif yang terlambat atau paling dekat tenggatnya."
      icon={<CalendarClock />}
      action={linkAction("/projects?tampilan=timeline", "Lihat timeline")}
    >
      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <CardEmpty>Belum ada proyek aktif yang terjadwal.</CardEmpty>
      ) : (
        <div className="overflow-x-auto">
          <Table boxed>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <ColumnLabel icon={<FolderKanban />}>Proyek</ColumnLabel>
                </TableHead>
                <TableHead>
                  <ColumnLabel icon={<GitBranch />}>Stage</ColumnLabel>
                </TableHead>
                <TableHead>
                  <ColumnLabel icon={<UserRound />}>PM</ColumnLabel>
                </TableHead>
                <TableHead>
                  <ColumnLabel icon={<CalendarClock />}>Tenggat</ColumnLabel>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ project: p, days }) => (
                <TableRow key={p.project_id}>
                  <TableCell>
                    <Link
                      to={`/projects/${p.project_id}`}
                      className="flex flex-col rounded-xs focus-ring hover:text-brand"
                    >
                      <span className="text-title-sm font-normal text-ink">{p.project_name}</span>
                      <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
                        <Building2 className="size-3" aria-hidden />
                        {p.client_name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ProjectStatusBadge name={p.status?.status_name} />
                  </TableCell>
                  <TableCell className="text-body-sm text-ink-secondary">
                    {p.pm ? toUserProfileInfo(p.pm, "PM").name : "-"}
                  </TableCell>
                  <TableCell>
                    <span className="flex flex-col">
                      <span className="text-body-sm text-ink tabular">{fmtDate(p.end_date)}</span>
                      <span
                        className={cn(
                          "text-caption",
                          days < 0 ? "text-error" : days <= 3 ? "text-warning" : "text-ink-muted",
                        )}
                      >
                        {days < 0 ? `Lewat ${-days} hari` : days === 0 ? "Hari ini" : `${days} hari lagi`}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </BentoCard>
  );
}
