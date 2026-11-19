import { CalendarClock, FolderKanban, GitBranch, Layers, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { ProjectStatusBadge } from "@/entities/project";
import { toUserProfileInfo } from "@/entities/user";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import type { RunningProject } from "../../model/techlead-metrics";
import { CardEmpty, CardSkeleton, ColumnLabel } from "../superadmin/card-states";

export function RunningProjectsCard({
  rows,
  isLoading,
  colSpan = 8,
  scrollable = false,
}: {
  rows: RunningProject[];
  isLoading: boolean;
  colSpan?: 7 | 8 | 12;
  /** Kartu setinggi layar dan menampilkan semua proyek (di-scroll), bukan hanya 6 teratas. */
  scrollable?: boolean;
}) {
  return (
    <BentoCard
      colSpan={colSpan}
      scrollable={scrollable}
      role="region"
      aria-label="Proyek Berjalan & Progres"
      title="Proyek Berjalan & Progres"
      icon={<Layers />}
      action={
        <Button asChild variant="link" className="h-auto p-0 text-xs">
          <Link to="/projects">Buka semua proyek</Link>
        </Button>
      }
    >
      {isLoading ? (
        <CardSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <CardEmpty>Tidak ada proyek berjalan.</CardEmpty>
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
                  <ColumnLabel icon={<TrendingUp />}>Progres vs waktu</ColumnLabel>
                </TableHead>
                <TableHead>
                  <ColumnLabel icon={<CalendarClock />}>Tenggat</ColumnLabel>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(scrollable ? rows : rows.slice(0, 6)).map(({ project: p, stage, time, daysLeft }) => {
                return (
                  <TableRow key={p.project_id}>
                    <TableCell>
                      <Link
                        to={`/projects/${p.project_id}`}
                        className="flex flex-col rounded-xs focus-ring hover:text-brand"
                      >
                        <span className="text-title-sm font-normal text-ink">{p.project_name}</span>
                        <span className="text-caption text-ink-muted">
                          {p.client_name} · PM {toUserProfileInfo(p.pm, "PM").name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ProjectStatusBadge name={p.status?.status_name} />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-36 flex-col gap-1.5">
                        <span
                          className="relative h-1.5 overflow-hidden rounded-full bg-surface-subtle"
                          role="img"
                          aria-label={`Stage ${stage}%, waktu terpakai ${time ?? 0}%`}
                        >
                          <span className="block h-full rounded-full bg-brand" style={{ width: `${stage}%` }} />
                          {time !== null ? (
                            <span
                              aria-hidden
                              className="absolute top-0 h-full w-0.5 bg-ink"
                              style={{ left: `calc(${time}% - 1px)` }}
                            />
                          ) : null}
                        </span>
                        <span className="text-caption text-ink-muted tabular-nums">
                          {stage}% stage · {time ?? "–"}% waktu
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-col">
                        <span className="text-body-sm text-ink tabular">{fmtDate(p.end_date)}</span>
                        {daysLeft !== null ? (
                          <span
                            className={cn(
                              "text-caption",
                              daysLeft < 0 ? "text-error" : daysLeft <= 3 ? "text-warning" : "text-ink-muted",
                            )}
                          >
                            {daysLeft < 0
                              ? `Lewat ${-daysLeft} hari`
                              : daysLeft === 0
                                ? "Hari ini"
                                : `${daysLeft} hari lagi`}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </BentoCard>
  );
}
