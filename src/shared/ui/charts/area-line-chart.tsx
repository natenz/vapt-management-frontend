import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/shared/lib/cn";

export interface AreaLineChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface AreaLineChartProps {
  data: AreaLineChartDataPoint[];
  height?: number;
  valueUnit?: string;
  seriesName?: string;
  secondarySeriesName?: string;
  className?: string;
}

/**
 * AreaLineChart — Grafik garis kurva halus (Smooth Cubic Bezier) berbasis SVG native.
 * Mengikuti spesifikasi Telkom Vermilion (§ 10 Data Visualization) tanpa external dependency.
 */
export function AreaLineChart({
  data,
  height = 200,
  valueUnit = "",
  seriesName = "Proyek",
  secondarySeriesName,
  className,
}: AreaLineChartProps) {
  const [containerWidth, setContainerWidth] = useState<number>(600);
  const cleanupObserverRef = useRef<(() => void) | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerRef = useCallback((el: HTMLDivElement | null) => {
    cleanupObserverRef.current?.();
    cleanupObserverRef.current = null;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      cleanupObserverRef.current = () => observer.disconnect();
    } else {
      window.addEventListener("resize", updateWidth);
      cleanupObserverRef.current = () => window.removeEventListener("resize", updateWidth);
    }
  }, []);

  useEffect(() => () => cleanupObserverRef.current?.(), []);

  const svgW = Math.max(containerWidth, 280);
  const svgH = height;
  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 16;
  const paddingBottom = 32;
  const plotW = Math.max(svgW - paddingLeft - paddingRight, 100);
  const plotH = Math.max(svgH - paddingTop - paddingBottom, 60);

  // Hitung nilai maksimum data
  const values = data.map((d) => d.value);
  if (secondarySeriesName) {
    values.push(...data.map((d) => d.secondaryValue ?? 0));
  }
  const maxVal = Math.max(...values, 4);
  const yTicks = [maxVal, Math.round(maxVal / 2), 0];

  // Koordinat titik-titik data
  const points = data.map((d, idx) => {
    const x =
      data.length <= 1
        ? paddingLeft + plotW / 2
        : paddingLeft + (idx / (data.length - 1)) * plotW;
    const y = paddingTop + plotH - (d.value / maxVal) * plotH;
    const secondaryY =
      d.secondaryValue !== undefined
        ? paddingTop + plotH - (d.secondaryValue / maxVal) * plotH
        : undefined;
    return { x, y, secondaryY, ...d };
  });

  // Path kurva Cubic Bezier garis utama
  const linePath = points.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    if (!prev) return acc;
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (curr.x - prev.x) / 2;
    const cpY2 = curr.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
  }, "");

  // Path area gradient garis utama
  const firstP = points[0];
  const lastP = points[points.length - 1];
  const areaPath =
    firstP && lastP
      ? `${linePath} L ${lastP.x} ${paddingTop + plotH} L ${firstP.x} ${paddingTop + plotH} Z`
      : "";

  // Path kurva garis sekunder (jika ada)
  const secondaryLinePath = secondarySeriesName
    ? points.reduce((acc, curr, idx, arr) => {
        if (curr.secondaryY === undefined) return acc;
        if (idx === 0) return `M ${curr.x} ${curr.secondaryY}`;
        const prev = arr[idx - 1];
        if (!prev || prev.secondaryY === undefined) return acc;
        const cpX1 = prev.x + (curr.x - prev.x) / 2;
        const cpY1 = prev.secondaryY;
        const cpX2 = prev.x + (curr.x - prev.x) / 2;
        const cpY2 = curr.secondaryY;
        return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.secondaryY}`;
      }, "")
    : "";

  // Pointer event
  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const localX = ((e.clientX - rect.left) / rect.width) * svgW;
    const ratio = points.length <= 1 ? 0 : (localX - paddingLeft) / plotW;
    const nearestIdx = Math.min(
      Math.max(Math.round(ratio * (points.length - 1)), 0),
      points.length - 1,
    );
    setHoveredIndex(nearestIdx);
  };

  const handlePointerLeave = () => setHoveredIndex(null);

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full select-none", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <svg
        width="100%"
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Gradient Area VAPT Red */}
          <linearGradient id="vaptAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-viz-1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-viz-1)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Garis Grid Horizontal (viz-grid) */}
        {yTicks.map((val, i) => {
          const y = paddingTop + (i / (yTicks.length - 1)) * plotH;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={svgW - paddingRight}
                y2={y}
                stroke="var(--color-viz-grid)"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[10px] fill-ink-muted tabular-nums"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Label Sumbu X */}
        {points.map((p, i) => {
          // Tampilkan label sumbu X secukupnya agar tidak berhimpitan
          const step = Math.ceil(points.length / 6);
          const isVisible = i === 0 || i === points.length - 1 || i % step === 0;
          if (!isVisible) return null;
          return (
            <text
              key={i}
              x={p.x}
              y={svgH - 10}
              textAnchor="middle"
              className="text-[10px] fill-ink-muted tabular-nums"
            >
              {p.label}
            </text>
          );
        })}

        {/* Area Isian Gradient */}
        {areaPath && <path d={areaPath} fill="url(#vaptAreaGrad)" />}

        {/* Garis Sekunder (Dashed) */}
        {secondaryLinePath && (
          <path
            d={secondaryLinePath}
            fill="none"
            stroke="var(--color-viz-3)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        )}

        {/* Garis Utama (Solid Red) */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-viz-1)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Hover Crosshair & Dots */}
        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={paddingTop}
              x2={hoveredPoint.x}
              y2={paddingTop + plotH}
              stroke="var(--color-viz-grid)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            {/* Dot Titik Utama */}
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="4.5"
              fill="var(--color-surface)"
              stroke="var(--color-viz-1)"
              strokeWidth="2.5"
            />
            {/* Dot Titik Sekunder */}
            {hoveredPoint.secondaryY !== undefined && (
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.secondaryY}
                r="3.5"
                fill="var(--color-surface)"
                stroke="var(--color-viz-3)"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {/* Floating Interactive Tooltip */}
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute z-tooltip rounded-sm border border-border bg-surface px-2.5 py-1.5 shadow-raised transition-transform duration-75 text-xs text-ink"
          style={{
            left: `${Math.min(Math.max(hoveredPoint.x, 70), svgW - 70)}px`,
            top: `${Math.max(hoveredPoint.y - 42, 6)}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="font-medium text-ink">{hoveredPoint.label}</div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-brand" />
              <span className="text-ink-muted">{seriesName}:</span>
              <strong className="font-medium tabular-nums">{hoveredPoint.value} {valueUnit}</strong>
            </span>
            {secondarySeriesName && hoveredPoint.secondaryValue !== undefined && (
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-ink-muted" />
                <span className="text-ink-muted">{secondarySeriesName}:</span>
                <strong className="font-medium tabular-nums">{hoveredPoint.secondaryValue} {valueUnit}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
