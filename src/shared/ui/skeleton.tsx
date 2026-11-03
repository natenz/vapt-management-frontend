/**
 * Skeleton — Design.md § 7 Component Language > Loading and empty states  *(derived)*
 *
 * "Skeletons are `surface-subtle` blocks at the real component shape with
 *  `radius-sm`, no shimmer beyond a slow 1.2s fade."
 *
 * Dan § 8: "Content uses `surface-subtle` skeletons at final shape. No
 * full-page blockers." Karena itu komponen ini sengaja tidak punya varian
 * overlay layar penuh — skeleton selalu menggantikan satu blok konten.
 */
import * as React from "react";
import { cn } from "@/shared/lib/cn";

function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-skeleton rounded-sm bg-surface-subtle", className)}
      {...props}
    />
  );
}

/**
 * Skeleton untuk satu baris tabel, mengikuti tinggi baris asli (56px).
 * Spec: bentuknya harus bentuk akhir komponen, bukan kotak generik.
 */
function SkeletonRow({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex h-14 items-center gap-4 border-b border-border px-4", className)}>
      {Array.from({ length: columns }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-1/3" : "flex-1")} />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonRow };
