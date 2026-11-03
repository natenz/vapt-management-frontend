/**
 * Textarea — Design.md § Component Guidelines > Input  *(derived)*
 *
 * Anatomi Input yang sama (radius-sm, border-control 3:1, padding space-3,
 * style `input`), hanya tingginya bebas. Tinggi minimum dipatok ke kelipatan
 * space supaya tetap selaras dengan irama kolom form.
 */
import * as React from "react";
import { cn } from "@/shared/lib/cn";

function Textarea({ className, rows = 4, ...props }: React.ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(
        "min-h-24 w-full rounded-sm border border-border-control bg-surface px-3 py-2",
        "text-input text-ink placeholder:text-ink-muted",
        "transition-[color,border-color,box-shadow] duration-150 ease-out",
        "hover:border-ink-secondary",
        "focus-visible:border-focus focus-ring",
        "disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-surface-subtle disabled:text-ink-disabled",
        "aria-invalid:border-error",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
