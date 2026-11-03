/**
 * Avatar — *(derived)*
 *
 * Tidak ada di Design.md. Mengikuti aturan bentuk sistem: radius-full hanya
 * untuk hal yang memang melingkar, fallback memakai `surface-subtle` dengan
 * inisial dalam style `badge` — bukan ikon orang generik, karena inisial
 * lebih informatif pada daftar panjang.
 */
import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/shared/lib/cn";

const SIZES = { sm: "size-8", md: "size-10", lg: "size-12" } as const;

type AvatarProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
  size?: keyof typeof SIZES;
};

function Avatar({ className, size = "md", ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full border border-border",
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn("size-full object-cover", className)} {...props} />;
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center bg-surface-subtle text-badge text-ink-secondary",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
