/**
 * Button — Design.md § Component Guidelines > Button
 *
 * "An outline-first action button in a 40px rounded rectangle, with solid,
 *  quiet and text-link variants."
 *
 * Aturan yang dikodekan di sini:
 *  - Height space-10 (h-10), padding space-5 (px-5), radius-sm, label `button`,
 *    icon gap space-2.
 *  - Hover outline: isi brand-tint dan label berubah ke brand-hover.
 *  - Pressed: brand-pressed. Disabled: border-strong + ink-disabled.
 *  - Loading menjaga lebar dan menukar ikon belakang dengan spinner 16px.
 *  - Focus memakai shadow-focus (utility focus-ring).
 *  - "Never make a button a pill" -> tidak ada varian radius-full.
 */
import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";
import { Spinner } from "@/shared/ui/spinner";

const buttonVariants = cva(
  [
    "group inline-flex h-10 shrink-0 items-center justify-center gap-2",
    "rounded-sm px-5 text-button whitespace-nowrap",
    "transition-[color,background-color,border-color,box-shadow] duration-150 ease-out",
    "focus-ring",
    "disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Default dan call to action utama. */
        outline: [
          "border border-brand bg-bg text-brand",
          "hover:bg-brand-tint hover:text-brand-hover",
          "active:bg-brand-soft active:text-brand-pressed",
          "disabled:border-border-strong disabled:bg-bg disabled:text-ink-disabled",
        ],
        /**
         * Satu-satunya konversi yang harus mengungguli semuanya. Satu per view.
         *
         * Memakai `surface-brand`, bukan `brand`. Spec Button menulis
         * "Solid (brand fill, on-brand label)" dan di tema terang keduanya
         * identik (red-600). Tapi `brand` adalah warna TINTA: di tema gelap ia
         * naik ke red-400 supaya link tetap terbaca, dan teks putih di atas
         * red-400 hanya mencapai 3.39:1. `surface-brand` adalah token ISIAN
         * milik spec dan tetap red-600 di kedua tema, jadi pasangannya dengan
         * `on-brand` lolos 5.01:1 di mana pun.
         */
        solid: [
          "bg-surface-brand text-on-brand",
          "hover:bg-surface-brand-hover",
          "active:bg-surface-brand-pressed",
          "disabled:bg-surface-subtle disabled:text-ink-disabled",
        ],
        /** Cancel dan aksi tersier. */
        quiet: [
          "text-ink-secondary",
          "hover:bg-surface-subtle hover:text-ink",
          "active:bg-surface-subtle active:text-ink",
          "disabled:bg-transparent disabled:text-ink-disabled",
        ],
        /** Aksi per-card dengan penekanan visual minimal. */
        link: [
          "h-auto gap-1 px-0 text-brand",
          "hover:text-brand-hover",
          "active:text-brand-pressed",
          "disabled:text-ink-disabled",
        ],
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Ikon setelah label untuk status atau affordance fungsional. */
    trailingIcon?: React.ReactNode;
    /** Ikon sebelum label. */
    leadingIcon?: React.ReactNode;
    /** Menjaga lebar tombol dan menukar trailing icon dengan spinner 16px. */
    loading?: boolean;
  };

function Button({
  className,
  variant,
  asChild = false,
  trailingIcon,
  leadingIcon,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  // Loading menukar ikon belakang dengan spinner, bukan menambah elemen baru,
  // supaya lebar tombol tidak berubah.
  const trailing = loading ? <Spinner /> : trailingIcon;

  return (
    <Comp
      data-slot="button"
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {leadingIcon}
      {/*
       * Slottable menandai MANA anak yang menjadi target slot saat asChild
       * dipakai. Tanpa ini, Slot menerima tiga anak (ikon depan, label, ikon
       * belakang) dan melempar "Expected a single React element child".
       * Di luar Slot, Slottable hanya meneruskan anaknya apa adanya.
       */}
      <Slottable>{children}</Slottable>
      {trailing ? <span className="inline-flex shrink-0">{trailing}</span> : null}
    </Comp>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
