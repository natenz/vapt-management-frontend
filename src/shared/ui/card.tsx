/**
 * Card — Design.md § Component Guidelines > Card
 *
 * "The system's flat, hairline-bordered card in three forms: feature card with
 *  an illustration, segment card with an icon tile and eyebrow, and an unboxed
 *  list row."
 *
 * Aturan yang dikodekan:
 *  - Card: `surface`, 1px `border`, radius-md, padding space-6. Tinggi sama
 *    dalam satu baris (h-full + flex kolom), link menempel ke bawah (mt-auto).
 *  - Resting flat. Hover *(derived)*: border-strong + shadow-raised.
 *  - Selected *(derived)*: border-brand di atas brand-tint.
 *  - "No left-border accents, no drop shadows at rest."
 *  - Icon tile segment: 40px `surface-brand`, glyph putih, radius-sm.
 *  - Eyebrow uppercase `brand`.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const cardVariants = cva(
  [
    "flex h-full flex-col rounded-md border bg-surface p-6",
    "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
  ],
  {
    variants: {
      /** Seluruh kartu menjadi target; hover mengangkat border dan shadow. */
      interactive: {
        true: "hover:border-border-strong hover:shadow-raised focus-within:border-border-strong",
        false: "",
      },
      selected: {
        true: "border-brand bg-brand-tint",
        false: "border-border",
      },
    },
    defaultVariants: { interactive: false, selected: false },
  },
);

type CardProps = React.ComponentPropsWithoutRef<"div"> & VariantProps<typeof cardVariants>;

function Card({ className, interactive, selected, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ interactive, selected }), className)}
      {...props}
    />
  );
}

/**
 * Kotak ikon 40px untuk segment card dan list row.
 * Spec: "40px `surface-brand` icon tile with a white glyph at `radius-sm`".
 */
function CardIconTile({ className, children, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card-icon-tile"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-sm bg-surface-brand text-on-brand [&_svg]:size-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Label kategori, uppercase, brand. */
function CardEyebrow({ className, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p
      data-slot="card-eyebrow"
      className={cn("text-eyebrow text-brand uppercase", className)}
      {...props}
    />
  );
}

type CardTitleProps = React.ComponentPropsWithoutRef<"h3"> & {
  /** lg = feature card, md = segment card, sm = list row. */
  size?: "lg" | "md" | "sm";
};

function CardTitle({ className, size = "md", ...props }: CardTitleProps) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        { lg: "text-title-lg", md: "text-title-md", sm: "text-title-sm" }[size],
        "text-ink",
        className,
      )}
      {...props}
    />
  );
}

type CardDescriptionProps = React.ComponentPropsWithoutRef<"p"> & {
  size?: "body" | "sm";
};

function CardDescription({ className, size = "sm", ...props }: CardDescriptionProps) {
  return (
    <p
      data-slot="card-description"
      className={cn(size === "body" ? "text-body" : "text-body-sm", "text-ink-secondary", className)}
      {...props}
    />
  );
}

/** Menempelkan aksi ke dasar kartu supaya satu baris kartu rata. */
function CardFooter({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div data-slot="card-footer" className={cn("mt-auto pt-6", className)} {...props} />;
}

/**
 * List row — bentuk ketiga: tidak berkotak, tile di kiri, gap space-4.
 */
function ListRow({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div data-slot="list-row" className={cn("flex gap-4", className)} {...props} />;
}

export { Card, CardIconTile, CardEyebrow, CardTitle, CardDescription, CardFooter, ListRow };
export type { CardProps, CardTitleProps, CardDescriptionProps };
