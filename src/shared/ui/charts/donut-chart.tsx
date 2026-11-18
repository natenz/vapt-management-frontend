import { useState } from "react";
import { cn } from "@/shared/lib/cn";

export interface DonutSegment {
  id?: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  centerValue?: string | number;
  centerLabel?: string;
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  className?: string;
}

/**
 * DonutChart — Visualisasi rasio proporsi berbasis SVG lingkaran multi-segmen.
 * Didesain ringan, flat, dan responsif terhadap tema terang/gelap.
 */
export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 140,
  thickness = 18,
  showLegend = true,
  className,
}: DonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  return (
    <div className={cn("flex flex-wrap items-center justify-around gap-4", className)}>
      {/* SVG Ring Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="var(--color-surface-subtle)"
            strokeWidth={thickness}
          />

          {/* Segmen-segmen Donut */}
          {total > 0 &&
            segments.map((seg, idx) => {
              const percent = seg.value / total;
              const dashLength = percent * circumference;
              const dashSpace = circumference - dashLength;
              const strokeOffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;

              const isHovered = hoveredIdx === idx;

              return (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? thickness + 3 : thickness}
                  strokeDasharray={`${dashLength} ${dashSpace}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="butt"
                  className="transition-[stroke-width] duration-150 cursor-pointer"
                  onPointerEnter={() => setHoveredIdx(idx)}
                  onPointerLeave={() => setHoveredIdx(null)}
                />
              );
            })}
        </svg>

        {/* Center Stat Typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-xl font-bold leading-none text-ink tabular-nums tracking-tight">
            {hoveredIdx !== null ? segments[hoveredIdx]?.value : centerValue ?? total}
          </span>
          {centerLabel && (
            <span className="text-[10px] uppercase font-medium text-ink-muted mt-0.5 tracking-wider">
              {hoveredIdx !== null ? segments[hoveredIdx]?.label : centerLabel}
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-1.5 min-w-[120px]">
          {segments.map((seg, idx) => {
            const percent = total > 0 ? Math.round((seg.value / total) * 100) : 0;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between gap-2 px-1 py-0.5 rounded-xs text-xs transition-colors cursor-pointer",
                  isHovered ? "bg-surface-subtle font-medium text-ink" : "text-ink-secondary",
                )}
                onPointerEnter={() => setHoveredIdx(idx)}
                onPointerLeave={() => setHoveredIdx(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate max-w-[90px]">{seg.label}</span>
                </div>
                <div className="flex items-center gap-1 tabular-nums font-normal text-ink">
                  <span>{seg.value}</span>
                  <span className="text-[10px] text-ink-muted">({percent}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
