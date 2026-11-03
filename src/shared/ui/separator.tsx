/**
 * Separator — Design.md § 6 Shape Language  *(derived)*
 *
 * Spec memisahkan permukaan dengan hairline 1px dan ruang, bukan shadow.
 * Ini pembungkus tipis supaya pemisah tidak ditulis ulang sebagai <div
 * className="h-px bg-border"> di sepuluh tempat.
 */
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/shared/lib/cn";

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      orientation={orientation}
      decorative={decorative}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
