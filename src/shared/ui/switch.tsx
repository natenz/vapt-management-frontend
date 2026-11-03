/**
 * Switch — *(derived)*
 *
 * Untuk pengaturan yang berlaku seketika (notifikasi, integrasi). Kalau
 * perubahannya baru berlaku setelah Simpan, pakai Checkbox — itu perbedaan
 * yang paling sering dilanggar dan paling membingungkan user.
 *
 * Spec § 8 melarang skala pada hover, jadi knob hanya bergeser, tidak membesar.
 */
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/shared/lib/cn";

function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent p-0.5",
        "bg-border-strong transition-colors duration-150 ease-out focus-ring",
        "data-[state=checked]:bg-surface-brand",
        "disabled:cursor-not-allowed disabled:bg-surface-subtle",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none size-5 rounded-full bg-surface shadow-float",
          "transition-transform duration-150 ease-out",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
