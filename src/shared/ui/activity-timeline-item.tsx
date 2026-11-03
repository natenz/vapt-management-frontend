import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function ActivityTimelineItem({
  icon,
  markerClassName,
  title,
  meta,
  last = false,
}: {
  icon: ReactNode;
  markerClassName: string;
  title: ReactNode;
  meta: ReactNode;
  last?: boolean;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex shrink-0 flex-col items-center">
        <span
          aria-hidden
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-full [&_svg]:size-5",
            markerClassName,
          )}
        >
          {icon}
        </span>
        {last ? null : <span aria-hidden className="w-px flex-1 bg-border" />}
      </div>

      <div className={cn("min-w-0 flex-1 pt-3", last ? "pb-0" : "pb-7")}>
        <p className="min-w-0 text-title-sm break-words text-ink">{title}</p>
        <p className="mt-2 text-caption text-ink-muted">{meta}</p>
      </div>
    </li>
  );
}
