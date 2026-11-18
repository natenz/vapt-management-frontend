import { cn } from "@/shared/lib/cn";

export interface StackedBarItem {
  label: string;
  count: number;
  colorClass: string;
}

export interface StackedBarChartProps {
  items: StackedBarItem[];
  height?: number;
  showLabels?: boolean;
  className?: string;
}

/**
 * StackedBarChart — Bar proporsional horizontal untuk menampilkan komposisi tahap siklus atau status.
 */
export function StackedBarChart({
  items,
  height = 10,
  showLabels = true,
  className,
}: StackedBarChartProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className={cn("flex flex-col gap-2.5 w-full", className)}>
      {/* Track Bar Multi Segmen */}
      <div
        className="flex w-full overflow-hidden rounded-full bg-surface-subtle"
        style={{ height }}
      >
        {total > 0 ? (
          items.map((item, idx) => {
            const percent = (item.count / total) * 100;
            if (percent <= 0) return null;

            return (
              <div
                key={idx}
                className={cn("h-full transition-[width] duration-300", item.colorClass)}
                style={{ width: `${percent}%` }}
                title={`${item.label}: ${item.count} (${Math.round(percent)}%)`}
              />
            );
          })
        ) : (
          <div className="h-full w-full bg-surface-subtle" />
        )}
      </div>

      {/* Label & Legend */}
      {showLabels && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {items.map((item, idx) => {
            const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full shrink-0", item.colorClass)} />
                <span className="text-ink-secondary">{item.label}</span>
                <strong className="text-ink font-medium tabular-nums">
                  {item.count}
                  <span className="text-[10px] text-ink-muted ml-0.5 font-normal">
                    ({percent}%)
                  </span>
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
