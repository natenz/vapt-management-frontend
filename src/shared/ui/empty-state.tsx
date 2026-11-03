/**
 * EmptyState — Design.md § 7 Component Language > Loading and empty states  *(derived)*
 *
 * "Empty states are centered: a 40px icon tile, `title-md`, one line of
 *  `body-sm`, and an outline button."
 *
 * Tile ikonnya sama persis dengan tile segment card (40px, `surface-brand`,
 * glyph putih, radius-sm), supaya empty state terbaca sebagai bagian sistem
 * dan bukan halaman error yang terdampar.
 */
import * as React from "react";
import { cn } from "@/shared/lib/cn";
import { CardIconTile } from "@/shared/ui/card";

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  /** Satu baris saja. */
  description?: string;
  /** Satu tombol Outline. */
  action?: React.ReactNode;
  className?: string;
};

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center gap-4 px-6 py-16 text-center", className)}
    >
      <CardIconTile>{icon}</CardIconTile>
      <div className="flex flex-col gap-2">
        <p className="text-title-md text-ink">{title}</p>
        {description ? (
          <p className="max-w-copy text-body-sm text-ink-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
