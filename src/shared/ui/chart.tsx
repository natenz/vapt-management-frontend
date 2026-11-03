/**
 * Chart — Design.md § 10 Data Visualization  *(derived)*
 *
 * Spec § 10 sangat spesifik dan sangat mudah dilanggar kalau Recharts dipakai
 * langsung. Modul ini menetapkan aturannya SEKALI sebagai preset, sehingga
 * halaman tidak pernah memilih warna, gridline, atau gaya sumbu sendiri:
 *
 *   "Flat, no gradients, no shadows, no 3D. Lines 2px with 4px round end caps;
 *    bars with `radius-xs` at the top and 8px minimum gaps; areas at 12 to 16%
 *    opacity."
 *   "Gridlines in `viz-grid` (1px), no vertical gridlines, axis labels in
 *    `caption` `ink-muted`, tabular figures, no axis lines except the baseline."
 *   "One series or bar in `viz-1`; everything else `viz-3`. The eye goes to the
 *    one that matters."
 *   "Do not encode a series by red versus green."
 *
 * Warna diambil lewat `var(--color-viz-*)`, bukan nilai hex, supaya chart ikut
 * berganti saat tema berubah tanpa satu baris pun kode tema di sini.
 */
import * as React from "react";
import { cn } from "@/shared/lib/cn";

/* ------------------------------------------------------------------ *
 * Palet
 * ------------------------------------------------------------------ */

/**
 * Pola sorot § 10: SATU seri memakai viz-1, sisanya viz-3.
 * Dipanggil dengan indeks seri; bukan dipilih tangan per chart.
 */
function seriesColor(index: number, highlightIndex = 0): string {
  return index === highlightIndex ? "var(--color-viz-1)" : "var(--color-viz-3)";
}

/**
 * Untuk chart kategorikal yang memang butuh lebih dari dua warna
 * (mis. distribusi severity). Spec: "If more than four series are needed,
 * split the chart instead."
 */
const VIZ_SERIES = [
  "var(--color-viz-1)",
  "var(--color-viz-2)",
  "var(--color-viz-3)",
  "var(--color-viz-4)",
  "var(--color-viz-5)",
] as const;

const VIZ_MAX_SERIES = VIZ_SERIES.length;

/* ------------------------------------------------------------------ *
 * Preset Recharts
 * ------------------------------------------------------------------ */

/** Sumbu: label `caption` `ink-muted`, angka tabular, tanpa garis sumbu. */
const axisProps = {
  stroke: "var(--color-ink-muted)",
  tickLine: false,
  axisLine: false,
  tick: {
    fill: "var(--color-ink-muted)",
    fontSize: 12,
    fontVariantNumeric: "tabular-nums",
  },
} as const;

/** Baseline adalah satu-satunya garis sumbu yang diizinkan. */
const baselineProps = {
  ...axisProps,
  axisLine: { stroke: "var(--color-viz-grid)" },
} as const;

/** Gridline horizontal saja. Vertikal dilarang spec. */
const gridProps = {
  stroke: "var(--color-viz-grid)",
  strokeWidth: 1,
  vertical: false,
} as const;

/** Garis 2px dengan round cap, tanpa titik di setiap data point. */
const lineProps = {
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  dot: false,
  activeDot: { r: 4, strokeWidth: 0 },
} as const;

/** Area 12-16% opacity. */
const areaFillOpacity = 0.14;

/** Bar: radius-xs (4px) di atas saja. */
const barRadius: [number, number, number, number] = [4, 4, 0, 0];

/** Spec: gap minimal 8px antar bar. */
const barGap = 8;

/* ------------------------------------------------------------------ *
 * Tooltip
 * ------------------------------------------------------------------ */

type TooltipEntry = { name?: string; value?: number | string; color?: string };

/**
 * Tooltip § 10: `surface`, 1px `border`, radius-sm, `shadow-raised`,
 * label `caption` dan nilai `title-sm`.
 */
function ChartTooltipContent({
  active,
  label,
  payload,
  formatValue,
}: {
  active?: boolean;
  label?: React.ReactNode;
  payload?: TooltipEntry[];
  formatValue?: (value: number | string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-sm border border-border bg-surface px-3 py-2 shadow-raised">
      {label == null ? null : <p className="text-caption text-ink-muted">{label}</p>}
      <ul className="mt-1 flex flex-col gap-1">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-caption text-ink-muted">{entry.name}</span>
            <span className="ml-auto text-title-sm text-ink tabular">
              {formatValue && entry.value != null ? formatValue(entry.value) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kursor hover: garis tipis viz-grid, bukan blok abu-abu bawaan Recharts. */
const tooltipCursor = { stroke: "var(--color-viz-grid)", strokeWidth: 1 } as const;

/* ------------------------------------------------------------------ *
 * Bingkai
 * ------------------------------------------------------------------ */

type ChartFrameProps = {
  /** `title-sm` dalam ink. */
  title: string;
  /**
   * Satu baris kesimpulan di bawah judul — spec § 10 menyebutnya "a one-line
   * takeaway". Bukan deskripsi sumbu; katakan apa artinya.
   */
  takeaway?: string;
  /** Aksi kecil di kanan judul, mis. pemilih rentang waktu. */
  action?: React.ReactNode;
  /** Tinggi area plot. */
  height?: number;
  children: React.ReactNode;
  className?: string;
};

/**
 * Kartu chart: `surface` + hairline + radius-md, sesuai § 10
 * "Metric cards in apps". Datar saat rest — tanpa shadow.
 */
function ChartFrame({
  title,
  takeaway,
  action,
  height = 260,
  children,
  className,
}: ChartFrameProps) {
  return (
    <section className={cn("rounded-md border border-border bg-surface p-6", className)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-title-sm text-ink">{title}</h3>
          {takeaway ? <p className="text-body-sm text-ink-secondary">{takeaway}</p> : null}
        </div>
        {action}
      </header>

      <div className="mt-6" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

/**
 * Legend § 10 adalah cadangan: "Prefer direct labels at line ends and bar
 * tops; a legend is a fallback, placed above the chart in `caption`."
 */
function ChartLegend({
  items,
  className,
}: {
  items: readonly { label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-4", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-caption text-ink-muted">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export {
  ChartFrame,
  ChartLegend,
  ChartTooltipContent,
  seriesColor,
  VIZ_SERIES,
  VIZ_MAX_SERIES,
  axisProps,
  baselineProps,
  gridProps,
  lineProps,
  areaFillOpacity,
  barRadius,
  barGap,
  tooltipCursor,
};
