/**
 * Accordion — Design.md § Component Guidelines > Accordion
 *
 * "A full-width list of hairline-separated question rows, one open at a time,
 *  with the answer revealed beneath."
 *
 * Aturan yang dikodekan:
 *  - Baris dipisah 1px `border`, tanpa box dan tanpa fill.
 *  - Pertanyaan `title-sm` ink di kiri, chevron 16px ink-secondary di kanan
 *    (turun saat tertutup, naik saat terbuka).
 *  - Jawaban `body-lg` ink-secondary, sejajar dengan pertanyaan, space-5 di bawah.
 *  - Padding baris space-5 vertikal.
 *  - Satu baris terbuka pada satu waktu (type="single" collapsible).
 *  - Tinggi dan opacity beranimasi 200ms ease-out; chevron berputar 180 derajat.
 *  - Hover memindahkan pertanyaan ke brand-hover.
 *  - Header baris adalah <button> dengan aria-expanded dan shadow-focus
 *    (keduanya dari Radix + utility focus-ring).
 *
 * Chevron diberi data-chevron supaya base layer bisa mematikan rotasinya di
 * bawah prefers-reduced-motion (§ 8).
 */
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const Accordion = AccordionPrimitive.Root;

function AccordionItem({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      // Hairline pemisah, bukan kotak. Baris terakhir tidak bergaris.
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex flex-1 items-center justify-between gap-4 py-5 text-left",
          "text-title-sm text-ink transition-colors duration-150 ease-out",
          "hover:text-brand-hover focus-ring",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          data-chevron
          aria-hidden
          className="size-4 shrink-0 text-ink-secondary transition-transform duration-200 ease-out group-data-[state=open]:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      {/* Sejajar dengan pertanyaan, space-5 di bawah. */}
      <div className={cn("pb-5 text-body-lg text-ink-secondary", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
