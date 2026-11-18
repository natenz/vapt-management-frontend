import { cn } from "@/shared/lib/cn";
import { MANDAYS_LIMIT } from "@/shared/config/workload";

export interface CapacityGaugeProps {
  current: number;
  limit?: number;
  label?: string;
  unit?: string;
  subtext?: string;
  className?: string;
}

/**
 * CapacityGauge — Indikator kapasitas beban kerja personil vs ambang batas bulanan.
 */
export function CapacityGauge({
  current,
  limit = MANDAYS_LIMIT,
  label = "Beban Alokasi",
  unit = "MD",
  subtext,
  className,
}: CapacityGaugeProps) {
  const percent = Math.min(100, Math.round((current / limit) * 100));
  const isOver = current > limit;
  const isBusy = current >= 15 && !isOver;

  const barColor = isOver
    ? "bg-rose-600 dark:bg-rose-400"
    : isBusy
      ? "bg-amber-500 dark:bg-amber-400"
      : "bg-emerald-600 dark:bg-emerald-400";

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-ink">
          <strong className="text-sm font-semibold">{current}</strong>
          <span className="text-ink-muted"> / {limit} {unit}</span>
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {subtext && <p className="text-[11px] text-ink-muted">{subtext}</p>}
    </div>
  );
}
