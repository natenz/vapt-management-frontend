/**
 * Footer — Design.md § Component Guidelines > Footer
 *
 * "A quiet footer with a brand block, link columns, a hairline and a centered
 *  copyright."
 *
 * Aturan yang dikodekan:
 *  - `container-default`, padding atas space-16.
 *  - Grid tiga kolom, blok brand lebih lebar: wordmark + deskripsi `body-lg`
 *    ink-secondary maksimal 320px.
 *  - Heading kolom 14px / 600 `ink`; link `caption` ink-muted dengan pitch
 *    sekitar 34px, hover brand-hover.
 *  - Garis hairline selebar penuh, lalu copyright rata tengah `body-sm`
 *    ink-muted.
 *  - "No dark footer background; the footer stays white so the page ends as
 *    calmly as it began."
 *  - Kolom menumpuk di bawah bp-md.
 */
import * as React from "react";
import { cn } from "@/shared/lib/cn";
import { Wordmark } from "@/shared/ui/nav-bar";

type FooterLink = { label: string; href: string };
type FooterColumn = { heading: string; links: readonly FooterLink[] };

type FooterProps = {
  wordmark?: string;
  logo?: React.ReactNode;
  /** Satu atau dua baris. */
  description?: string;
  columns?: readonly FooterColumn[];
  copyright: string;
  className?: string;
};

function Footer({
  wordmark = "Vermilion",
  logo,
  description,
  columns = [],
  copyright,
  className,
}: FooterProps) {
  return (
    // Putih, bukan ground gelap.
    <footer data-slot="footer" className={cn("bg-bg", className)}>
      <div className="mx-auto max-w-default px-4 pt-16">
        {/* Blok brand lebih lebar dari kolom link. */}
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            {logo ?? <Wordmark>{wordmark}</Wordmark>}
            {description ? (
              <p className="max-w-[320px] text-body-lg text-ink-secondary">{description}</p>
            ) : null}
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading} className="flex flex-col">
              <h2 className="mb-2 text-button font-semibold text-ink">{column.heading}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      // Pitch sekitar 34px: caption (leading 18px) + space-2 atas-bawah.
                      className="inline-flex items-center rounded-xs py-2 text-caption text-ink-muted transition-colors duration-150 ease-out hover:text-brand-hover focus-ring"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <hr className="mt-16 border-t border-border" />

        <p className="py-6 text-center text-body-sm text-ink-muted">{copyright}</p>
      </div>
    </footer>
  );
}

export { Footer };
export type { FooterProps, FooterColumn, FooterLink };
