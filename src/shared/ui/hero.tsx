/**
 * Hero — Design.md § Component Guidelines > Hero
 *
 * "The opening band: a pill, a gradient-ended headline, two lines of subcopy,
 *  one outline button, and one glowing object on a pink-tinted wash."
 *
 * Aturan yang dikodekan:
 *  - Ground `bg-wash` radial memudar ke `bg` (utility gradient-hero-wash).
 *  - Stack tengah berirama space-8: pill, headline `display` dengan gradient
 *    emphasis pada kalimat kedua, subcopy `body-lg` selebar `container-copy`,
 *    satu tombol Outline.
 *  - Stage sekitar 280px berisi setengah cakram coral (`red-400` memudar ke
 *    `bg-wash`) dengan busur konsentris halus dan satu objek solid
 *    `surface-brand`; tepinya di-mask supaya glow tidak pernah punya sisi keras.
 *  - Cue "Scroll for more" dalam `ink-muted` dengan chevron di bawahnya.
 *  - "Do not add a second button or a second glow" — komponen hanya menerima
 *    SATU label tombol, jadi tombol kedua tidak bisa diselipkan.
 *  - Konten hero mulai space-12 di bawah nav; band berikutnya space-32 jauhnya.
 */
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Pill } from "@/shared/ui/badge";

type HeroProps = {
  /** Teks di kapsul solid, mis. "Powered by". */
  pillAccent?: string;
  pillLabel?: string;
  /** Kalimat pernyataan. */
  headline: string;
  /** Kalimat baliknya — bagian inilah yang memakai gradient emphasis. */
  headlineEmphasis?: string;
  /** Maksimal dua baris. */
  subcopy?: string;
  /** Satu tombol Outline saja. */
  actionLabel?: string;
  onAction?: () => void;
  /** Cue gulir di bawah stage. */
  scrollCue?: string;
  className?: string;
};

function Hero({
  pillAccent,
  pillLabel,
  headline,
  headlineEmphasis,
  subcopy,
  actionLabel,
  onAction,
  scrollCue = "Scroll for more",
  className,
}: HeroProps) {
  return (
    <section
      data-slot="hero"
      className={cn("relative overflow-hidden gradient-hero-wash", className)}
    >
      {/* Irama space-8 di antara elemen stack. */}
      <div className="mx-auto flex max-w-default flex-col items-center gap-8 px-4 pt-12 text-center">
        {pillAccent && pillLabel ? <Pill accent={pillAccent}>{pillLabel}</Pill> : null}

        <h1 className="text-display text-ink">
          {headline}
          {headlineEmphasis ? (
            <>
              {" "}
              <span className="text-emphasis-gradient">{headlineEmphasis}</span>
            </>
          ) : null}
        </h1>

        {subcopy ? <p className="max-w-copy text-body-lg text-ink-secondary">{subcopy}</p> : null}

        {actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      </div>

      <HeroStage />

      <p className="flex flex-col items-center gap-1 pb-12 text-caption text-ink-muted">
        {scrollCue}
        <ChevronDown className="size-4" aria-hidden />
      </p>
    </section>
  );
}

/**
 * Stage 280px: setengah cakram coral + busur konsentris + satu objek solid.
 * Tepi di-mask ke transparan supaya glow tidak pernah memperlihatkan sisi keras.
 */
function HeroStage() {
  return (
    <div
      aria-hidden
      className="relative mx-auto mt-12 h-[280px] w-full max-w-default overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <svg
        viewBox="0 0 800 280"
        className="absolute bottom-0 left-1/2 h-full w-[800px] -translate-x-1/2"
        role="presentation"
      >
        <defs>
          <radialGradient id="vm-hero-disc" cx="50%" cy="100%" r="70%">
            <stop offset="0%" stopColor="var(--color-red-400)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-bg-wash)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Setengah cakram coral. */}
        <circle cx="400" cy="280" r="260" fill="url(#vm-hero-disc)" />

        {/* Busur konsentris halus. */}
        {[120, 170, 220].map((r) => (
          <circle
            key={r}
            cx="400"
            cy="280"
            r={r}
            fill="none"
            stroke="var(--color-red-400)"
            strokeOpacity="0.25"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Satu objek solid, satu-satunya glow di halaman. */}
      <div className="absolute bottom-0 left-1/2 size-24 -translate-x-1/2 translate-y-1/2 rounded-full bg-surface-brand shadow-glow" />
    </div>
  );
}

export { Hero };
export type { HeroProps };
