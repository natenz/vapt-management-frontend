import { ArrowRight, CalendarRange } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import type { ProjectDetail } from "@/entities/project";
import { toUserProfileInfo, type User } from "@/entities/user";
import { cn } from "@/shared/lib/cn";
import { BentoCard } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { weeklyHeatmap, type LoadLevel } from "../../model/techlead-metrics";
import { CardEmpty, CardError, CardSkeleton } from "../superadmin/card-states";

const CELL: Record<LoadLevel | "idle", string> = {
  idle: "bg-surface-subtle text-ink-muted",
  free: "bg-success-bg text-success",
  busy: "bg-warning-bg text-warning",
  full: "bg-error-bg text-error",
};

const LEGEND: { key: keyof typeof CELL; label: string }[] = [
  { key: "idle", label: "Kosong" },
  { key: "free", label: "< 50%" },
  { key: "busy", label: "50–100%" },
  { key: "full", label: "> 100%" },
];

const weekLabel = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`));

export function WorkloadHeatmapCard({
  pentesters,
  details,
  isLoading,
  error,
}: {
  pentesters: readonly User[];
  details: readonly ProjectDetail[];
  isLoading: boolean;
  error: unknown;
}) {
  const { weeks, rows } = useMemo(() => weeklyHeatmap(pentesters, details, 8), [pentesters, details]);

  return (
    <BentoCard
      colSpan={7}
      role="region"
      aria-label="Ketersediaan & Penugasan Personil"
      title="Beban Pentester 8 Minggu ke Depan"
      description="Persentase MD terpakai per minggu kerja (5 MD = 100%)."
      icon={<CalendarRange />}
      action={
        <Button asChild variant="link" trailingIcon={<ArrowRight />} className="h-auto p-0 text-xs">
          <Link to="/resources?tampilan=timeline">Cek Benturan Jadwal di Linimasa</Link>
        </Button>
      }
    >
      {error ? (
        <CardError title="Jadwal penugasan belum bisa dimuat" error={error} />
      ) : isLoading ? (
        <CardSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <CardEmpty>Belum ada pentester terdaftar.</CardEmpty>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-xs">
              <caption className="sr-only">Heatmap beban mingguan pentester</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-40 text-left font-normal text-ink-muted">
                    Pentester
                  </th>
                  {weeks.map((w, i) => (
                    <th key={w.start} scope="col" className="font-normal text-ink-muted">
                      <span className={cn("tabular-nums", i === 0 && "text-brand")}>
                        {i === 0 ? "Minggu ini" : weekLabel(w.start)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const info = toUserProfileInfo(r.user);
                  return (
                    <tr key={r.user.sys_user_id}>
                      <th scope="row" className="max-w-40 truncate text-left font-normal text-ink">
                        {info.name}
                      </th>
                      {r.cells.map((c, i) => {
                        const pct = Math.round(c.utilization * 100);
                        return (
                          <td
                            key={weeks[i]!.start}
                            title={`${info.name} · ${weekLabel(weeks[i]!.start)}: ${c.booked} MD (${pct}%)`}
                            className={cn(
                              "h-8 rounded-xs text-center tabular-nums",
                              CELL[c.booked === 0 ? "idle" : c.level],
                            )}
                          >
                            {c.booked === 0 ? "–" : `${pct}%`}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-wrap items-center gap-3 text-caption text-ink-muted" aria-label="Legenda">
            {LEGEND.map((l) => (
              <li key={l.key} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("size-3 rounded-xs", CELL[l.key])} />
                {l.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </BentoCard>
  );
}
