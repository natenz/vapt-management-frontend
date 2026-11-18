import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export const GANTT_TOOLTIP_WIDTH = 256;
const TOOLTIP_HEIGHT = 168;

/**
 * Tooltip Gantt yang mengikuti kursor (posisi fixed). Tooltip bawaan SVAR
 * ter-portal ke root tema sehingga posisinya meleset di dalam layout dashboard.
 * Di kanan-bawah titik acuan; dibalik bila mendekati tepi layar.
 */
export function GanttTooltip({
  x,
  y,
  children,
  pinned = false,
  className,
  "data-slot": dataSlot = "gantt-tooltip",
}: {
  x: number;
  y: number;
  children: ReactNode;
  /** Tooltip yang disematkan (klik/Enter) menerima interaksi pointer. */
  pinned?: boolean;
  className?: string;
  "data-slot"?: string;
}) {
  const left =
    x + 16 + GANTT_TOOLTIP_WIDTH > window.innerWidth ? x - 16 - GANTT_TOOLTIP_WIDTH : x + 16;
  const top = y + 16 + TOOLTIP_HEIGHT > window.innerHeight ? y - 16 - TOOLTIP_HEIGHT : y + 16;
  return (
    <div
      role="tooltip"
      data-slot={dataSlot}
      data-pinned={pinned || undefined}
      style={{ left: Math.max(8, left), top: Math.max(8, top), width: GANTT_TOOLTIP_WIDTH }}
      className={cn(
        "fixed z-50 rounded-md border border-border bg-surface p-3 text-xs text-ink shadow-raised",
        !pinned && "pointer-events-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
