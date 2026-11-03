/**
 * Badge — Design.md § Component Guidelines > Badge
 *
 * "Small pills, counts, status chips and tags that label or count without
 *  drawing attention away from content."
 *
 * Spec mengenal empat bentuk. Tiga di antaranya netral (pill, count, tag) dan
 * satu membawa status. Aturan yang dikodekan:
 *  - Teks badge selalu style `badge` (12px / 500).
 *  - Count badge radius-full, minimal 24px, surface-subtle; di dalam chip
 *    terpilih menjadi red-200 dengan teks red-700.
 *  - "Never use color alone": StatusBadge mewajibkan ikon DAN kata lewat tipe,
 *    bukan lewat konvensi.
 *  - "Do not place ink-muted text on red-100 or red-50; use red-700."
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

/* ------------------------------------------------------------------ *
 * Count & tag
 * ------------------------------------------------------------------ */

const badgeVariants = cva("inline-flex items-center justify-center text-badge", {
  variants: {
    variant: {
      /** Kuantitas di samping label kategori. Informasi netral, bukan status. */
      count: "min-w-6 rounded-full px-2 py-0.5",
      /** Label netral. */
      tag: "rounded-xs bg-surface-subtle px-2 py-0.5 text-ink-secondary",
    },
    /** Di dalam chip terpilih, count badge berubah ground. */
    selected: { true: "", false: "" },
  },
  compoundVariants: [
    { variant: "count", selected: false, class: "bg-surface-subtle text-ink-secondary" },
    { variant: "count", selected: true, class: "bg-red-200 text-red-700" },
  ],
  defaultVariants: { variant: "count", selected: false },
});

type BadgeProps = React.ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, selected, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, selected }), className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Status badge (derived)
 * ------------------------------------------------------------------ */

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-badge [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        info: "border-info-border bg-info-bg text-info",
        success: "border-success-border bg-success-bg text-success",
        warning: "border-warning-border bg-warning-bg text-warning",
        error: "border-error-border bg-error-bg text-error",
        /**
         * Status yang tidak sedang berjalan dan tidak bermasalah (draf, arsip).
         * Pasangan ink-secondary di atas surface-subtle sudah diuji tokens:check.
         */
        neutral: "border-border bg-surface-subtle text-ink-secondary",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

type StatusBadgeProps = Omit<React.ComponentPropsWithoutRef<"span">, "children"> &
  VariantProps<typeof statusBadgeVariants> & {
    /**
     * Wajib. Spec § Badge: "Never use color alone: pair every status with an
     * icon or dot and a word." Dibuat required supaya tidak bisa dilewati.
     */
    icon: React.ReactNode;
    /** Wajib: kata yang menyebut statusnya. */
    children: React.ReactNode;
  };

function StatusBadge({ className, tone, icon, children, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Pill — kapsul dua lapis di atas headline hero
 * ------------------------------------------------------------------ */

type PillProps = React.ComponentPropsWithoutRef<"span"> & {
  /** Teks di dalam kapsul solid brand. */
  accent: React.ReactNode;
};

/**
 * Spec: "an outer capsule (surface, hairline border, radius-full) holding a
 * `caption` label and an inner solid surface-brand pill with on-brand `badge`
 * text; use it once above a hero headline."
 */
function Pill({ className, accent, children, ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1 text-caption text-ink-secondary",
        className,
      )}
      {...props}
    >
      <span className="rounded-full bg-surface-brand px-2 py-0.5 text-badge text-on-brand">
        {accent}
      </span>
      {children}
    </span>
  );
}

export { Badge, StatusBadge, Pill, badgeVariants, statusBadgeVariants };
export type { BadgeProps, StatusBadgeProps, PillProps };
