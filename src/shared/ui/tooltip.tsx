/**
 * Tooltip — *(derived)*
 *
 * Anatomi mengikuti tooltip chart di spec § 10: `surface`, 1px `border`,
 * radius-sm, `shadow-raised`, teks `caption`.
 *
 * Spec § 8: "Never rely on hover for essential information (touch has none)."
 * Jadi tooltip hanya untuk keterangan tambahan, tidak pernah untuk satu-satunya
 * label sebuah kontrol.
 */
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/shared/lib/cn";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-overlay rounded-sm border border-border bg-surface px-3 py-1.5 text-caption text-ink shadow-raised",
          "duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent };
