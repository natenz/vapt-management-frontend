/**
 * RadioGroup — *(derived)*
 *
 * Bentuk lingkaran dengan titik brand di tengah. Mengikuti aturan kontrol
 * yang sama dengan Checkbox: border-control 3:1, focus-ring, tanpa shadow.
 */
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/shared/lib/cn";

function RadioGroup({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "size-4 shrink-0 rounded-full border border-border-control bg-surface",
        "transition-[border-color,box-shadow] duration-150 ease-out",
        "hover:border-ink-secondary focus-ring",
        "data-[state=checked]:border-surface-brand",
        "disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-surface-subtle",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex size-full items-center justify-center">
        <span className="size-2 rounded-full bg-surface-brand" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
