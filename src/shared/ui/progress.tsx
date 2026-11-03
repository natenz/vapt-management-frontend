/**
 * Progress — *(derived)*
 *
 * Track `surface-subtle`, indikator `brand`. Spec § 9 menyebut brand dipakai
 * untuk "satu penekanan per view", jadi progress bar tidak boleh ditebar:
 * gunakan untuk satu proses yang sedang berjalan, bukan sebagai hiasan baris.
 */
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/shared/lib/cn";

type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  /** Nilai 0-100. */
  value?: number;
};

function Progress({ className, value = 0, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-subtle", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-brand transition-[width] duration-150 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
