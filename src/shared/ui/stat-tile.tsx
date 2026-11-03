/**
 * StatTile — Design.md § Component Guidelines > StatTile
 *
 * "A dark or brand metric tile with a large numeral and a label, used in a
 *  two-column bento grid with photo tiles."
 *
 * Aturan yang dikodekan:
 *  - radius-lg, padding space-6, `stat-number` di atas `stat-label`, keduanya
 *    ink-inverse (label boleh ink-inverse-muted di atas charcoal).
 *  - Isian: gradient charcoal, gradient brand, atau foto grayscale di bawah
 *    scrim dengan teks duduk di scrim bagian bawah.
 *  - Tile pendek sekitar 148px, tile foto sekitar 490px, gap grid space-6.
 *  - "Use tabular figures when values change."
 *
 * "Only one brand tile per grid; it marks the number that matters most."
 * Aturan ini tidak bisa dipaksakan dari dalam satu komponen, jadi
 * <StatTileGrid> yang memeriksanya dan memperingatkan saat development.
 */
import * as React from "react";
import { cn } from "@/shared/lib/cn";

type StatTileProps = {
  /** Klaim pendek: "10K+", "24/7", sebuah tahun. */
  value: React.ReactNode;
  /** Menyebut apa yang dihitung. Spec: "Never show a number without a noun." */
  label: string;
  /** charcoal = default; brand = satu angka terpenting; photo = foto grayscale. */
  fill?: "charcoal" | "brand";
  /** Tile pendek (148px) atau tinggi (490px, untuk grid bento). */
  size?: "short" | "tall";
  className?: string;
};

function StatTile({ value, label, fill = "charcoal", size = "short", className }: StatTileProps) {
  return (
    <div
      data-slot="stat-tile"
      data-fill={fill}
      className={cn(
        "flex flex-col justify-end rounded-lg p-6",
        fill === "brand" ? "gradient-brand-tile" : "gradient-charcoal-tile",
        size === "short" ? "min-h-[148px]" : "min-h-[490px]",
        className,
      )}
    >
      <p className="text-stat-number text-ink-inverse tabular">{value}</p>
      <p
        className={cn(
          "text-stat-label",
          // Di atas charcoal label boleh lebih tenang; di atas brand harus penuh.
          fill === "charcoal" ? "text-ink-inverse-muted" : "text-ink-inverse",
        )}
      >
        {label}
      </p>
    </div>
  );
}

type PhotoStatTileProps = Omit<StatTileProps, "fill"> & {
  /** URL foto. Spec: grayscale, teks selalu di atas scrim. */
  src: string;
  alt?: string;
};

/**
 * Tile foto: foto grayscale, scrim wajib, teks duduk di scrim bagian bawah.
 * Spec: "Text over a photo always sits on the scrim, never on a bright area."
 */
function PhotoStatTile({
  value,
  label,
  src,
  alt = "",
  size = "tall",
  className,
}: PhotoStatTileProps) {
  return (
    <div
      data-slot="photo-stat-tile"
      className={cn("relative isolate overflow-hidden rounded-lg", className)}
    >
      <img src={src} alt={alt} className="absolute inset-0 size-full object-cover grayscale" />
      <div className="absolute inset-0 gradient-photo-scrim" aria-hidden />
      {/* Tinggi tile ditentukan blok konten ini, supaya foto dan scrim mengikuti. */}
      <div
        className={cn(
          "relative flex flex-col justify-end p-6",
          size === "short" ? "min-h-[148px]" : "min-h-[490px]",
        )}
      >
        <p className="text-stat-number text-ink-inverse tabular">{value}</p>
        <p className="text-stat-label text-ink-inverse">{label}</p>
      </div>
    </div>
  );
}

/**
 * Grid bento dua kolom dengan gap space-6.
 *
 * Memeriksa aturan "only one brand tile per grid" saat development. Ini
 * aturan komposisi, bukan aturan satu komponen, jadi tempatnya di sini.
 */
function StatTileGrid({ className, children, ...props }: React.ComponentPropsWithoutRef<"div">) {
  if (import.meta.env.DEV) {
    const brandTiles = React.Children.toArray(children).filter(
      (child) => React.isValidElement<StatTileProps>(child) && child.props.fill === "brand",
    ).length;

    if (brandTiles > 1) {
      console.warn(
        `[Vermilion] StatTileGrid berisi ${brandTiles} tile brand. ` +
          'Design.md § StatTile: "Only one brand tile per grid; it marks the number that matters most."',
      );
    }
  }

  return (
    <div
      data-slot="stat-tile-grid"
      className={cn("grid gap-6 sm:grid-cols-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { StatTile, PhotoStatTile, StatTileGrid };
export type { StatTileProps, PhotoStatTileProps };
