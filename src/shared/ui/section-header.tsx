/**
 * SectionHeader — Design.md § Component Guidelines > SectionHeader
 *
 * "The eyebrow, title and subcopy trio that introduces every section,
 *  centered on marketing pages and left-aligned beside media."
 *
 * Aturan yang dikodekan:
 *  - Eyebrow style `eyebrow`, uppercase, `brand`; gap space-3 ke judul.
 *  - Judul `display` (centered) atau `heading-1` (split), `ink`; gap space-4.
 *  - Subcopy `body-lg` ink-secondary dengan lebar maksimal `container-copy`.
 *  - Emphasis hanya SALAH SATU: gradient pada frasa penutup, atau underline
 *    brand 3px di bawah satu kata. "never both" — dipaksakan lewat tipe.
 *  - Gradient text hanya 24px ke atas, jadi hanya tersedia pada varian
 *    centered (`display`, 40px) dan split (`heading-1`, 36px).
 */
import { cn } from "@/shared/lib/cn";

type Emphasis =
  | { emphasis: "gradient"; emphasisText: string }
  | { emphasis: "underline"; emphasisText: string }
  | { emphasis?: undefined; emphasisText?: undefined };

type SectionHeaderProps = {
  /** Label kategori di atas judul. */
  eyebrow?: string;
  /** Sekitar enam kata. Spec: "One idea per header." */
  title: string;
  /** Satu atau dua baris. */
  subcopy?: string;
  /** centered untuk halaman marketing, split saat berdampingan dengan media. */
  align?: "center" | "start";
  className?: string;
} & Emphasis;

/**
 * Frasa emphasis ditempel di belakang judul, sesuai spec: gradient jatuh pada
 * "the closing phrase", underline pada satu kata.
 */
function SectionHeader({
  eyebrow,
  title,
  subcopy,
  align = "center",
  emphasis,
  emphasisText,
  className,
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div
      data-slot="section-header"
      className={cn("flex flex-col", centered ? "items-center text-center" : "items-start", className)}
    >
      {eyebrow ? <p className="mb-3 text-eyebrow text-brand uppercase">{eyebrow}</p> : null}

      <h2 className={cn(centered ? "text-display" : "text-heading-1", "text-ink")}>
        {title}
        {emphasisText ? (
          <>
            {" "}
            <span
              className={cn(
                emphasis === "gradient" && "text-emphasis-gradient",
                // Underline 3px brand, offset 4px.
                emphasis === "underline" &&
                  "underline decoration-brand decoration-[3px] underline-offset-4",
              )}
            >
              {emphasisText}
            </span>
          </>
        ) : null}
      </h2>

      {subcopy ? (
        <p className={cn("mt-4 max-w-copy text-body-lg text-ink-secondary")}>{subcopy}</p>
      ) : null}
    </div>
  );
}

export { SectionHeader };
export type { SectionHeaderProps };
