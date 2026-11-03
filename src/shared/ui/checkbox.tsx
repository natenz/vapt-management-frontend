/**
 * Checkbox — Design.md § Component Guidelines > Badge + § 8  *(derived)*
 *
 * Spec menyebut check kecil sebagai satu-satunya ikon solid yang diizinkan
 * (§ Badge). Kotaknya mengikuti aturan kontrol: radius-xs, border-control 3:1
 * supaya bisa ditemukan tanpa warna, focus-ring, target sentuh diurus
 * pemanggil lewat label.
 */
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/shared/lib/cn";

function Checkbox({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-xs border border-border-control bg-surface",
        "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
        "hover:border-ink-secondary focus-ring",
        "data-[state=checked]:border-surface-brand data-[state=checked]:bg-surface-brand",
        "data-[state=indeterminate]:border-surface-brand data-[state=indeterminate]:bg-surface-brand",
        "disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-surface-subtle",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-on-brand">
        {props.checked === "indeterminate" ? (
          <Minus className="size-3" aria-hidden />
        ) : (
          <Check className="size-3" aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
