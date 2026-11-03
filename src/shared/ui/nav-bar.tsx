/**
 * NavBar — Design.md § Component Guidelines > NavBar
 *
 * "A floating navigation card with the logo at the left and links at the
 *  right, whose active link follows the section in view."
 *
 * Aturan yang dikodekan:
 *  - `container-nav` (1200px), tinggi 76px, `surface` + 1px `border`,
 *    radius-lg, `shadow-float`; terlepas space-2 dari atas; sticky di `z-nav`
 *    supaya konten lewat di bawahnya.
 *  - Link: `nav-link` 14px, padding space-2 x space-4, radius-sm.
 *    Rest ink-secondary, hover ink, active fill surface-subtle + label brand.
 *  - Di bawah bp-md: bar 64px selebar layar minus 16px, hanya logo dan tombol
 *    menu; link terbuka di sheet dengan target 48px.
 *  - "The active state is set by scroll position or route, never by hover" —
 *    karena itu status aktif datang dari prop, bukan dari CSS :hover.
 *  - Wordmark: Geist 600 uppercase, tracking +0.04em, `red-700`.
 *
 * Catatan: ini navigasi gaya marketing/portal sesuai spec. App shell dashboard
 * (sidebar + topbar) adalah komponen terpisah dan menyusul di ronde 2.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/** Tinggi bar + jarak lepasnya dari atas. Band di bawahnya harus diberi padding sebesar ini. */
const NAV_OFFSET_CLASS = "pt-[92px] md:pt-[84px]";

type NavLink = {
  label: string;
  href: string;
};

type NavBarProps = {
  /** Wordmark teks, atau logo sungguhan lewat `logo`. */
  wordmark?: string;
  logo?: React.ReactNode;
  /** Sekitar lima link. */
  links: readonly NavLink[];
  /** href yang sedang aktif. Ditentukan route atau scroll-spy, bukan hover. */
  activeHref?: string;
  /** Aksi di ujung kanan, mis. satu tombol. */
  action?: React.ReactNode;
  className?: string;
};

function Wordmark({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-title-sm font-semibold tracking-[0.04em] text-red-700 uppercase">
      {children}
    </span>
  );
}

function NavBar({ wordmark = "Vermilion", logo, links, activeHref, action, className }: NavBarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <header
      data-slot="nav-bar"
      className={cn("sticky top-2 z-nav px-2 md:px-0", className)}
    >
      <nav
        className={cn(
          "mx-auto flex max-w-nav items-center justify-between gap-6 rounded-lg border border-border bg-surface shadow-float",
          // 64px di mobile, 76px dari bp-md ke atas.
          "h-16 px-4 md:h-[76px] md:px-6",
        )}
      >
        <a href="/" className="flex shrink-0 items-center gap-2 rounded-sm focus-ring">
          {logo ?? <Wordmark>{wordmark}</Wordmark>}
        </a>

        {/* Desktop */}
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = link.href === activeHref;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex rounded-sm px-4 py-2 text-nav-link transition-colors duration-150 ease-out focus-ring",
                    active
                      ? "bg-surface-subtle text-brand"
                      : "text-ink-secondary hover:text-ink",
                  )}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="hidden shrink-0 md:block">{action}</div>

        {/* Mobile */}
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger
            aria-label="Buka menu"
            className="inline-flex size-10 items-center justify-center rounded-sm text-ink-secondary transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-ink focus-ring md:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </DialogPrimitive.Trigger>

          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-overlay bg-ink/48 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:hidden" />
            <DialogPrimitive.Content className="fixed inset-x-2 top-2 z-modal rounded-lg border border-border bg-surface p-4 shadow-overlay duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 md:hidden">
              <DialogPrimitive.Title className="sr-only">Menu navigasi</DialogPrimitive.Title>

              <div className="mb-2 flex items-center justify-between">
                {logo ?? <Wordmark>{wordmark}</Wordmark>}
                <DialogPrimitive.Close
                  aria-label="Tutup menu"
                  className="inline-flex size-10 items-center justify-center rounded-sm text-ink-muted hover:bg-surface-subtle hover:text-ink focus-ring"
                >
                  <X className="size-5" aria-hidden />
                </DialogPrimitive.Close>
              </div>

              <ul className="flex flex-col">
                {links.map((link) => {
                  const active = link.href === activeHref;
                  return (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        // Target sentuh 48px.
                        className={cn(
                          "flex h-12 items-center rounded-sm px-4 text-nav-link focus-ring",
                          active ? "bg-surface-subtle text-brand" : "text-ink-secondary",
                        )}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>

              {action ? <div className="mt-4">{action}</div> : null}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </nav>
    </header>
  );
}

export { NavBar, Wordmark, NAV_OFFSET_CLASS };
export type { NavBarProps, NavLink };
