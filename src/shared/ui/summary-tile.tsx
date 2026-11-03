/**
 * SummaryTile — tile ringkasan dashboard (Figma "Card Active").
 *
 * Turunan StatTile untuk aplikasi: label kategori, angka besar dua digit,
 * satuan, dan satu baris keterangan dengan angka pendukung. Isian charcoal
 * atau brand-deep; satu tile brand per baris untuk angka yang paling penting.
 */
import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type SummaryTileProps = {
  label: string;
  /** null = belum ada angka yang bisa dipercaya (gagal dimuat). */
  value: number | null;
  /** Kata benda yang dihitung: "Proyek", "Temuan". */
  unit: string;
  icon: ReactNode;
  fill?: "charcoal" | "brand";
  /** Keterangan di bawah. `value` opsional ditebalkan sebelum teks. */
  note: { value?: ReactNode; text: string };
  loading?: boolean;
};

export function SummaryTile({
  label,
  value,
  unit,
  icon,
  fill = "charcoal",
  note,
  loading = false,
}: SummaryTileProps) {
  return (
    <article
      aria-busy={loading || undefined}
      className={cn(
        "flex flex-col rounded-md p-6 text-ink-inverse",
        fill === "brand" ? "gradient-brand-deep-tile" : "gradient-charcoal-tile",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-overline uppercase">{label}</h2>
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-sm bg-ink-inverse/10 [&_svg]:size-5"
        >
          {icon}
        </span>
      </div>

      <p className="mt-2 text-7xl leading-none font-medium tracking-tight tabular">
        {loading ? (
          <span className="block h-[1em] w-[2ch] animate-pulse rounded-sm bg-ink-inverse/10 motion-reduce:animate-none" />
        ) : value === null ? (
          "–"
        ) : (
          String(value).padStart(2, "0")
        )}
        {loading ? <span className="sr-only">Memuat</span> : null}
      </p>
      <p className="mt-2 text-overline text-ink-inverse-muted uppercase">{unit}</p>

      {loading ? (
        <span className="mt-6 block h-5 w-2/5 animate-pulse rounded-xs bg-ink-inverse/10 motion-reduce:animate-none" />
      ) : note.value !== undefined ? (
        <p className="mt-6 flex items-center gap-2 text-caption text-ink-inverse-muted">
          <TrendingUp className="size-4" aria-hidden />
          <span className="text-button text-ink-inverse tabular">{note.value}</span>
          {note.text}
        </p>
      ) : (
        <p className="mt-6 text-caption text-ink-inverse-muted">{note.text}</p>
      )}
    </article>
  );
}
