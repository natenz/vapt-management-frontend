import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Skeleton } from "@/shared/ui/skeleton";

/** Skeleton baris pada bentuk akhir kartu (bukan spinner). */
export function CardSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} aria-busy="true">
      <span className="sr-only">Memuat data</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

/** Galat ringkas di dalam satu kartu; kartu lain tetap tampil. */
export function CardError({ title, error }: { title: string; error: unknown }) {
  return (
    <Alert tone="error" title={title} compact>
      {error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data."}
    </Alert>
  );
}

/** Teks kosong ringkas untuk kartu kecil (EmptyState terlalu besar di kartu bento). */
export function CardEmpty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xs text-ink-muted">{children}</p>;
}

/** Header kolom tabel berikon — pola yang sama dengan tabel lain. */
export function ColumnLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-normal normal-case [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-ink-muted">
      <span aria-hidden className="contents">
        {icon}
      </span>
      <span>{children}</span>
    </span>
  );
}
