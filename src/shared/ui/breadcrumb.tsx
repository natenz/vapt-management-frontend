/**
 * Breadcrumb — *(derived)*
 *
 * Tidak ada di Design.md; spec hanya mengenal navigasi marketing. Mengikuti
 * aturan navigasi yang ada: tautan `caption` `ink-muted`, halaman sekarang
 * dalam `ink` dan TIDAK berupa tautan, pemisah chevron 16px `ink-disabled`.
 *
 * Spec § 8: status "di sini" tidak pernah ditentukan hover. Halaman sekarang
 * ditandai aria-current, bukan sekadar warna.
 */
import { ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type Crumb = {
  label: string;
  /** Tanpa href berarti ini halaman sekarang. */
  href?: string;
};

const linkClasses =
  "rounded-xs px-1 text-caption text-ink-muted transition-colors duration-150 ease-out hover:text-ink focus-ring";

type BreadcrumbProps = {
  items: readonly Crumb[];
  className?: string;
  /**
   * Cara merender tautan. Default `<a>` biasa, yang berarti klik memuat ulang
   * seluruh halaman — benar untuk tautan keluar, salah di dalam SPA. Shell
   * aplikasi mengoper renderer berbasis router supaya navigasinya tetap di
   * sisi klien. Dibuat opsional agar pemakai lama tidak berubah perilakunya.
   */
  renderLink?: (crumb: Crumb & { href: string }, className: string) => React.ReactNode;
};

function Breadcrumb({ items, className, renderLink }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {item.href && !last ? (
                renderLink ? (
                  renderLink({ ...item, href: item.href }, linkClasses)
                ) : (
                  <a href={item.href} className={linkClasses}>
                    {item.label}
                  </a>
                )
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn("px-1 text-caption", last ? "text-ink" : "text-ink-muted")}
                >
                  {item.label}
                </span>
              )}
              {last ? null : (
                <ChevronRight className="size-4 shrink-0 text-ink-disabled" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumb };
export type { Crumb, BreadcrumbProps };
