/**
 * SeverityBadge — (derived) tidak ada di Design.md.
 *
 * Kenapa perlu diturunkan sendiri: brand Vermilion adalah merah (`red-600`)
 * dan spec mengunci merah hanya untuk *action and place*
 * (§ 2 "Rules that keep the palette honest"). Di VAPT, merah berarti Critical.
 * Spec sendiri sudah menyebut konsekuensinya:
 *
 *   "Because the brand is red, error never relies on hue: it uses
 *    `alert-circle`, the word 'Error' and `error-bg`."   — § Component > Alert
 *
 * Maka severity di sini dibedakan oleh BERAT ISIAN + LIGHTNESS + IKON + KATA,
 * bukan oleh hue:
 *
 *   Critical  isian solid  (satu-satunya badge solid di sistem)
 *   High      tinted       error
 *   Medium    tinted       warning
 *   Low       tinted       info (slate netral, bukan hue baru)
 *   Info      tinted       netral paling ringan
 *
 * Isian solid untuk Critical meminjam pola "emphasis by fill" milik StatTile
 * (§ 10: "the single most important metric takes the red tile"). Lightness
 * menurun monoton dari Critical ke Info, jadi urutannya tetap terbaca tanpa
 * warna — memenuhi § 10 "Do not encode a series by red versus green".
 *
 * Ground `brand-soft` sengaja tidak dipakai severity apa pun karena sudah
 * menjadi ground state *selected* pada chip dan row (§ 8).
 *
 * Ikon dan kata dirender dari peta internal, bukan dari props, sehingga
 * § Badge "Never use color alone" tidak mungkin dilanggar pemanggil.
 */
import * as React from "react";
import { AlertCircle, AlertTriangle, CircleDot, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

type Severity = (typeof SEVERITIES)[number];

type SeverityMeta = {
  /** Kata yang selalu ikut dirender. */
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Kelas ground + teks + border, semuanya menunjuk token sev-*. */
  className: string;
};

const SEVERITY_META: Record<Severity, SeverityMeta> = {
  critical: {
    label: "Critical",
    icon: ShieldAlert,
    className: "border-sev-critical-border bg-sev-critical-bg text-sev-critical-fg",
  },
  high: {
    label: "High",
    icon: AlertTriangle,
    className: "border-sev-high-border bg-sev-high-bg text-sev-high-fg",
  },
  medium: {
    label: "Medium",
    icon: AlertCircle,
    className: "border-sev-medium-border bg-sev-medium-bg text-sev-medium-fg",
  },
  low: {
    label: "Low",
    icon: Info,
    className: "border-sev-low-border bg-sev-low-bg text-sev-low-fg",
  },
  info: {
    label: "Info",
    icon: CircleDot,
    className: "border-sev-info-border bg-sev-info-bg text-sev-info-fg",
  },
};

/** Urutan triage, paling berat lebih dulu. Dipakai juga untuk sort tabel. */
const SEVERITY_ORDER: readonly Severity[] = SEVERITIES;

/** Peringkat numerik untuk comparator tabel. Critical = 0. */
function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

type SeverityBadgeProps = Omit<React.ComponentPropsWithoutRef<"span">, "children"> & {
  severity: Severity;
  /** Jumlah temuan pada severity ini, mis. "12". Opsional. */
  count?: number;
};

function SeverityBadge({ severity, count, className, ...props }: SeverityBadgeProps) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;

  return (
    <span
      data-slot="severity-badge"
      data-severity={severity}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-badge",
        meta.className,
        className,
      )}
      {...props}
    >
      <Icon className="size-3.5 shrink-0" />
      {meta.label}
      {count === undefined ? null : <span className="tabular opacity-80">{count}</span>}
    </span>
  );
}

export { SeverityBadge, SEVERITY_META, SEVERITY_ORDER, severityRank };
export type { Severity, SeverityBadgeProps };
