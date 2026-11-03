/**
 * Tabs — Design.md § Component Guidelines > Tabs
 *
 * "A horizontally scrolling strip of category chips with icons, labels and
 *  counts, where the selected chip is tinted and swaps the panel below."
 *
 * Aturan yang dikodekan:
 *  - Chip: radius-md, 1px border, surface, padding space-3 x space-4,
 *    min-height 48px, ikon 16px, label title-sm, sub-label caption ink-muted,
 *    count badge radius-full. Jarak antar chip space-3.
 *  - Selected: fill brand-soft, border-brand-soft, label ink, count red-200
 *    dengan teks red-700.
 *  - Hover: border-strong. Focus: shadow-focus.
 *  - "The selected chip is the only tinted element in the strip."
 *  - Strip menggulir menyamping di setiap lebar; tombol chevron 40px di kedua
 *    ujung (desktop) dan menghilang saat sudah mentok.
 *  - Chip terpilih otomatis masuk ke dalam pandangan.
 *
 * Navigasi panah kiri/kanan dan roving tabindex ditangani Radix.
 */
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const Tabs = TabsPrimitive.Root;

/* ------------------------------------------------------------------ *
 * Strip
 * ------------------------------------------------------------------ */

function TabsList({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = React.useState({ start: false, end: false });

  const measure = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // 1px toleransi supaya pembulatan sub-pixel tidak menyalakan chevron.
    setOverflow({
      start: el.scrollLeft > 1,
      end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const scrollBy = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * 240, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center">
      <ScrollButton side="start" hidden={!overflow.start} onClick={() => scrollBy(-1)} />

      <div
        ref={scrollerRef}
        onScroll={measure}
        // Scrollbar disembunyikan: gulir lewat swipe (touch) atau chevron.
        className="flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsPrimitive.List
          data-slot="tabs-list"
          className={cn("flex w-max gap-3 p-0.5", className)}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </div>

      <ScrollButton side="end" hidden={!overflow.end} onClick={() => scrollBy(1)} />
    </div>
  );
}

function ScrollButton({
  side,
  hidden,
  onClick,
}: {
  side: "start" | "end";
  hidden: boolean;
  onClick: () => void;
}) {
  const Icon = side === "start" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      // Kontrol ini hanya kenyamanan; keyboard sudah dilayani panah kiri/kanan
      // milik Radix, jadi disembunyikan dari screen reader.
      aria-hidden
      tabIndex={-1}
      onClick={onClick}
      className={cn(
        "hidden size-10 shrink-0 items-center justify-center rounded-sm text-ink-secondary transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-ink md:flex",
        side === "start" ? "mr-2" : "ml-2",
        hidden && "invisible",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Chip
 * ------------------------------------------------------------------ */

type TabChipProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  icon?: React.ReactNode;
  /** Baris kedua yang lebih tenang, style caption. */
  subLabel?: string;
  /** Kuantitas netral — informasi, bukan status. */
  count?: number;
};

function TabChip({ className, icon, subLabel, count, children, ...props }: TabChipProps) {
  const ref = React.useRef<HTMLButtonElement>(null);

  // Spec: "the selected chip scrolls into view".
  React.useEffect(() => {
    const el = ref.current;
    if (el?.dataset.state === "active") {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tab-chip"
      className={cn(
        "group flex min-h-12 shrink-0 items-center gap-3 rounded-md border border-border bg-surface px-4 py-3",
        "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
        "hover:border-border-strong focus-ring",
        // Satu-satunya elemen bertint di dalam strip.
        "data-[state=active]:border-brand-soft data-[state=active]:bg-brand-soft",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {icon ? <span className="text-ink-secondary">{icon}</span> : null}

      <span className="flex flex-col items-start text-left">
        <span className="text-title-sm text-ink-secondary group-data-[state=active]:text-ink">
          {children}
        </span>
        {subLabel ? <span className="text-caption text-ink-muted">{subLabel}</span> : null}
      </span>

      {count === undefined ? null : (
        <span className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full bg-surface-subtle px-2 py-0.5 text-badge text-ink-secondary tabular group-data-[state=active]:bg-red-200 group-data-[state=active]:text-red-700">
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("mt-6 focus-ring", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabChip, TabsContent };
export type { TabChipProps };
