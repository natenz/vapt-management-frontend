import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import type { Project, ProjectStatus } from "@/entities/project";
import { buildScheduleTrend, formatRangeLabel } from "@/entities/project";
import {
  ScheduleRangeControls,
  useScheduleRange,
  type ScheduleRangeValue,
} from "@/features/schedule-range";
import { cn } from "@/shared/lib/cn";
import { Skeleton } from "@/shared/ui/skeleton";
import { SegmentedTabsList, SegmentedTabsTrigger, Tabs, TabsContent } from "@/shared/ui/tabs";

export type ScheduleView = "overview" | "timeline";

/** Konteks yang diberikan ke isi tab Timeline: rentang & interval yang sama dengan Overview. */
export interface TimelineRenderContext {
  schedule: ScheduleRangeValue;
  onScheduleChange: (next: ScheduleRangeValue) => void;
}

interface ProjectMetricsSectionProps {
  projects: Project[];
  statuses?: ProjectStatus[];
  isLoading?: boolean;
  className?: string;
  /**
   * Tampilan aktif. Bila diisi, halaman pemanggil yang mengendalikan
   * (mis. untuk ikut menyembunyikan tabel saat Timeline aktif).
   */
  view?: ScheduleView;
  onViewChange?: (view: ScheduleView) => void;
  /** Isi tab Timeline; dirakit oleh halaman agar widget tidak saling bergantung. */
  renderTimeline?: (context: TimelineRenderContext) => ReactNode;
  projectLabel?: string;
  projectNoun?: string;
}

export function ProjectMetricsSection({
  projects,
  statuses,
  isLoading = false,
  className,
  view: controlledView,
  onViewChange,
  renderTimeline,
  projectLabel = "Proyek",
  projectNoun = "proyek",
}: ProjectMetricsSectionProps) {
  const cleanupObserverRef = useRef<(() => void) | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

  // Default: snapshot per Bulan dengan rentang data tahun berjalan (dipakai bersama Timeline)
  const { value: schedule, onChange: setSchedule } = useScheduleRange();
  const { granularity, range } = schedule;
  const [uncontrolledView, setUncontrolledView] = useState<ScheduleView>("overview");
  const view = controlledView ?? uncontrolledView;
  const setView = (next: ScheduleView) => {
    setUncontrolledView(next);
    onViewChange?.(next);
  };
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Indeks terakhir dipertahankan agar isi tooltip tetap ada selama animasi fade-out
  const [lastHoveredIndex, setLastHoveredIndex] = useState<number | null>(null);
  // Posisi hanya dianimasikan saat berpindah antar titik, bukan saat pertama muncul
  const [animateTooltipPosition, setAnimateTooltipPosition] = useState(false);

  // Pantau lebar area grafik secara responsif. Memakai callback ref karena area
  // grafik baru dipasang setelah loading selesai; efek sekali-jalan akan
  // melewatkannya dan grafik tertahan di lebar awal (tampak mengecil di tengah).
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

  const { trend: currentTrend, totalScheduled } = buildScheduleTrend(projects, {
    statuses,
    granularity,
    range,
  });
  const rangeLabel = formatRangeLabel(range);
  // Titik penanda disembunyikan pada deret padat agar garis tetap bersih
  const showDots = currentTrend.length <= 60;

  // Hitung nilai maksimum sumbu Y untuk penskalaan
  const maxVal = Math.max(...currentTrend.map((t) => t.count), 4);
  const yTicks = [maxVal, Math.round(maxVal / 2), 0];

  // Dimensi dan padding grafik SVG
  const svgW = Math.max(containerWidth, 320);
  const svgH = 210;
  const paddingLeft = 44;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 40;
  const plotW = Math.max(svgW - paddingLeft - paddingRight, 100);
  const plotH = svgH - paddingTop - paddingBottom;

  // Titik data terpetakan tepat di atas koordinat grafik
  const points = currentTrend.map((t, idx) => {
    const x =
      currentTrend.length <= 1
        ? paddingLeft + plotW / 2
        : paddingLeft + (idx / (currentTrend.length - 1)) * plotW;
    const y = paddingTop + plotH - (t.count / maxVal) * plotH;
    return { x, y, ...t };
  });

  // Buat path kurva halus (Smooth Cubic Bezier)
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

  // Area path untuk gradient merah VAPT
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath =
    firstPoint && lastPoint
      ? `${linePath} L ${lastPoint.x} ${paddingTop + plotH} L ${firstPoint.x} ${paddingTop + plotH} Z`
      : "";

  // Deteksi hover terpusat: kursor dipetakan ke titik data terdekat pada sumbu X
  const handleChartPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;

    const localX = ((event.clientX - rect.left) / rect.width) * svgW;
    const ratio = points.length <= 1 ? 0 : (localX - paddingLeft) / plotW;
    const nearestIdx = Math.min(
      Math.max(Math.round(ratio * (points.length - 1)), 0),
      points.length - 1,
    );
    if (nearestIdx === hoveredIndex) return;

    setAnimateTooltipPosition(hoveredIndex !== null);
    setHoveredIndex(nearestIdx);
    setLastHoveredIndex(nearestIdx);
  };

  const handleChartPointerLeave = () => setHoveredIndex(null);

  // Data & posisi tooltip
  const tooltipIndex = hoveredIndex ?? lastHoveredIndex;
  const tooltipPoint = tooltipIndex !== null ? points[tooltipIndex] : undefined;
  const isTooltipVisible = hoveredIndex !== null && tooltipPoint !== undefined;
  const tooltipWidth = 224;
  const tooltipLeft = tooltipPoint
    ? Math.min(Math.max(tooltipPoint.x, tooltipWidth / 2 + 4), svgW - tooltipWidth / 2 - 4)
    : 0;
  // Titik yang terlalu dekat dengan tepi atas: tooltip dibalik ke bawah titik
  const tooltipBelow = tooltipPoint ? tooltipPoint.y < 96 : false;

  const handleScheduleChange = (next: ScheduleRangeValue) => {
    setSchedule(next);
    setHoveredIndex(null);
  };

  return (
    <section
      data-slot="project-metrics-section"
      className={cn("flex flex-col text-ink", className)}
    >
      <Tabs value={view} onValueChange={(v) => setView(v === "timeline" ? "timeline" : "overview")}>
        {/* 1. Baris kontrol di luar card: pengalih tampilan (kiri) + filter grafik (kanan) */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SegmentedTabsList aria-label={`Tampilan jadwal ${projectNoun}`} className="self-start">
            <SegmentedTabsTrigger value="overview">Overview</SegmentedTabsTrigger>
            <SegmentedTabsTrigger value="timeline">Timeline</SegmentedTabsTrigger>
          </SegmentedTabsList>

          {/* Interval snapshot + rentang data, dipakai bersama oleh Overview dan Timeline */}
          <ScheduleRangeControls
            value={schedule}
            onChange={handleScheduleChange}
            className="lg:justify-end"
          />
        </div>

        {/* 2. Overview: satu card berisi ikhtisar terjadwal + grafik */}
        <TabsContent value="overview" className="mt-4">
          <div className="min-w-0 rounded-md border border-border bg-surface p-6">
            <div data-slot="project-schedule-summary">
              <h2 className="text-sm font-normal text-ink-muted">Overview Jadwal {projectLabel}</h2>
              <div className="mt-1 flex items-baseline gap-3">
                {isLoading ? (
                  <Skeleton className="h-9 w-12" />
                ) : (
                  <span className="text-3xl font-normal text-ink tabular-nums">
                    {totalScheduled}
                  </span>
                )}
                <span className="text-sm font-normal text-ink-secondary">
                  Total Terjadwal ({rangeLabel})
                </span>
              </div>
            </div>

            {/* Area Line Chart Responsif Tema Dinamis (Light / Night) dengan Gradient Merah VAPT */}
            {isLoading ? (
              <div className="mt-6 flex h-[210px] w-full flex-col justify-end gap-3 pb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-28 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ) : (
              <div
                className="relative mt-6 w-full touch-pan-y select-none"
                ref={containerRef}
                onPointerMove={handleChartPointerMove}
                onPointerDown={handleChartPointerMove}
                onPointerLeave={handleChartPointerLeave}
              >
                {/* Tooltip mengambang: muncul langsung di titik pertama, lalu meluncur halus antar titik */}
                {tooltipPoint ? (
                  <div
                    data-slot="project-schedule-tooltip"
                    data-state={isTooltipVisible ? "open" : "closed"}
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute z-20",
                      animateTooltipPosition &&
                        "transition-[left,top] duration-200 ease-out motion-reduce:transition-none",
                    )}
                    style={{
                      left: `${tooltipLeft}px`,
                      top: `${tooltipPoint.y}px`,
                      width: `${tooltipWidth}px`,
                      transform: tooltipBelow
                        ? "translate(-50%, 14px)"
                        : "translate(-50%, calc(-100% - 14px))",
                    }}
                  >
                    <div
                      className={cn(
                        "rounded-sm border border-border bg-surface px-3 py-2.5 text-xs font-normal text-ink shadow-raised transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
                        isTooltipVisible
                          ? "translate-y-0 opacity-100"
                          : cn("opacity-0", tooltipBelow ? "-translate-y-1" : "translate-y-1"),
                      )}
                    >
                      {/* Periode */}
                      <p className="text-[11px] text-ink-muted">{tooltipPoint.dateStr}</p>

                      {/* Jumlah proyek */}
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-lg leading-none text-ink tabular-nums">
                          {tooltipPoint.count}
                        </span>
                        <span className="text-ink-secondary">{projectNoun} terjadwal</span>
                      </div>

                      {/* Daftar proyek */}
                      {tooltipPoint.projectNames.length > 0 ? (
                        <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                          {tooltipPoint.projectNames.slice(0, 3).map((name, i) => (
                            <li
                              key={`${name}-${i}`}
                              className="flex min-w-0 items-center gap-2 text-ink-secondary"
                            >
                              <span
                                aria-hidden
                                className="size-1.5 shrink-0 rounded-full bg-ink-muted"
                              />
                              <span className="min-w-0 truncate">{name}</span>
                            </li>
                          ))}
                          {tooltipPoint.projectNames.length > 3 ? (
                            <li className="pl-3.5 text-[11px] text-ink-muted">
                              +{tooltipPoint.projectNames.length - 3} {projectNoun} lainnya
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <p className="mt-2 border-t border-border pt-2 text-[11px] text-ink-muted">
                          Tidak ada {projectNoun} pada periode ini
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                <svg
                  data-slot="project-schedule-chart"
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full overflow-visible"
                  style={{ height: `${svgH}px` }}
                >
                  <defs>
                    {/* Gradient Merah VAPT Telkom */}
                    <linearGradient id="vaptRedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.28" />
                      <stop offset="80%" stopColor="var(--color-brand)" stopOpacity="0.04" />
                      <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Garis Grid Horizontal Mengikuti Tema (viz-grid) */}
                  {yTicks.map((tickVal, i) => {
                    const y = paddingTop + plotH - (tickVal / maxVal) * plotH;
                    return (
                      <g key={i}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgW - paddingRight}
                          y2={y}
                          stroke="var(--color-viz-grid)"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingLeft - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-ink-muted text-[11px] font-normal"
                        >
                          {tickVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area Gradient Merah di Bawah Garis */}
                  {areaPath ? <path d={areaPath} fill="url(#vaptRedGradient)" /> : null}

                  {/* Garis Tren Merah VAPT */}
                  {linePath ? (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="var(--color-brand)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}

                  {/* Titik Interaktif (Data Points) & Garis Pemandu Hover */}
                  {points.map((pt, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <g key={idx} className="cursor-pointer">
                        {/* Garis vertikal pemandu saat hover */}
                        {isHovered ? (
                          <line
                            x1={pt.x}
                            y1={pt.y + 6}
                            x2={pt.x}
                            y2={svgH - 26}
                            stroke="var(--color-brand)"
                            strokeWidth="1"
                            strokeDasharray="3 3"
                            strokeOpacity="0.35"
                          />
                        ) : null}

                        {/* Area Tangkapan Hover Luas */}
                        <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />

                        {/* Lingkaran Titik Merah */}
                        {showDots || isHovered ? (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5.5 : 3.5}
                            fill="var(--color-brand)"
                            className="transition-all duration-150"
                          />
                        ) : null}
                        {isHovered ? (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={8}
                            fill="var(--color-brand)"
                            fillOpacity="0.25"
                          />
                        ) : null}
                      </g>
                    );
                  })}

                  {/* Label Sumbu X yang berpusat pada koordinat data */}
                  {points.map((pt, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const showLabel =
                      currentTrend.length <= 14
                        ? true
                        : currentTrend.length <= 31
                          ? svgW >= 640
                            ? idx % 2 === 0 || idx === currentTrend.length - 1
                            : idx % 4 === 0 || idx === currentTrend.length - 1
                          : idx % Math.ceil(currentTrend.length / 8) === 0 ||
                            idx === currentTrend.length - 1;

                    return (
                      <g key={idx} className="cursor-pointer">
                        <rect
                          x={pt.x - 20}
                          y={svgH - 30}
                          width={40}
                          height={28}
                          fill="transparent"
                        />

                        {showLabel ? (
                          <text
                            x={pt.x}
                            y={svgH - 12}
                            textAnchor="middle"
                            className={cn(
                              "text-[11px] font-normal transition-colors duration-150 select-none",
                              isHovered ? "fill-ink" : "fill-ink-muted",
                            )}
                          >
                            {pt.label}
                          </text>
                        ) : null}

                        {isHovered ? (
                          <line
                            x1={pt.x - 12}
                            y1={svgH - 4}
                            x2={pt.x + 12}
                            y2={svgH - 4}
                            stroke="var(--color-brand)"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. Timeline: isi dirakit oleh halaman; panel kosong bila tidak disediakan */}
        <TabsContent value="timeline" className="mt-4">
          {renderTimeline ? (
            renderTimeline({ schedule, onScheduleChange: handleScheduleChange })
          ) : (
            <div
              data-slot="project-timeline-panel"
              className="min-h-72 rounded-md border border-border bg-surface"
            />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
