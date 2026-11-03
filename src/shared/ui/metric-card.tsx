/**
 * MetricCard — Design.md § 10 Data Visualization  *(derived)*
 *
 * "Metric cards in apps: `surface` + `border` + `radius-md`: `overline` label,
 *  `display`-scale numeral (36px, tabular), and a delta chip (status color
 *  plus arrow icon plus signed number)."
 *
 * Berbeda dari StatTile, yang berisian gelap dan dipakai di grid bento
 * marketing. MetricCard adalah versi aplikasinya: datar, putih, hairline.
 *
 * Delta memakai warna status PLUS ikon panah PLUS angka bertanda — tiga
 * isyarat, sesuai larangan mengandalkan warna saja.
 */
import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type MetricCardProps = {
  /** Label `overline`, uppercase. */
  label: string;
  /** Angka atau klaim pendek. */
  value: React.ReactNode;
  /**
   * Perubahan sejak periode sebelumnya, dalam persen atau jumlah.
   * Positif berarti naik — apakah itu baik atau buruk ditentukan `goodDirection`.
   */
  delta?: number;
  /** Untuk metrik temuan, naik itu BURUK. Default "down" = turun itu baik. */
  goodDirection?: "up" | "down";
  /** Satu baris konteks di bawah angka. */
  hint?: string;
  className?: string;
};

function MetricCard({
  label,
  value,
  delta,
  goodDirection = "down",
  hint,
  className,
}: MetricCardProps) {
  return (
    <article className={cn("flex flex-col gap-2 rounded-md border border-border bg-surface p-6", className)}>
      <p className="text-overline text-ink-muted uppercase">{label}</p>

      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-heading-1 text-ink tabular">{value}</p>
        {delta === undefined ? null : <DeltaChip delta={delta} goodDirection={goodDirection} />}
      </div>

      {hint ? <p className="text-caption text-ink-muted">{hint}</p> : null}
    </article>
  );
}

function DeltaChip({ delta, goodDirection }: { delta: number; goodDirection: "up" | "down" }) {
  const flat = delta === 0;
  const rising = delta > 0;
  const good = flat ? null : rising === (goodDirection === "up");

  const Icon = flat ? Minus : rising ? ArrowUpRight : ArrowDownRight;
  const tone = flat
    ? "border-border bg-surface-subtle text-ink-muted"
    : good
      ? "border-success-border bg-success-bg text-success"
      : "border-error-border bg-error-bg text-error";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-badge tabular",
        tone,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {/* Tanda ditulis eksplisit: warna dan panah saja tidak cukup. */}
      {delta > 0 ? "+" : ""}
      {delta}%
    </span>
  );
}

export { MetricCard };
export type { MetricCardProps };
