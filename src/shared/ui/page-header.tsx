/**
 * Kepala halaman aplikasi.
 *
 * Spec § 4 Layout Language + § 9: satu ide per kepala. Judul `heading-1`,
 * subcopy `body-sm` `ink-muted` selebar container-copy, aksi di kanan.
 *
 * `heading-page` sengaja TIDAK dipakai di sini — style itu untuk banner gelap
 * (§ 3), sedangkan halaman aplikasi berlatar terang.
 */
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-1 text-ink">{title}</h1>
        {description ? (
          <p className="max-w-copy text-body-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
