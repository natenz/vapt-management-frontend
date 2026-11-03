/**
 * Sheet (drawer) — *(derived)*
 *
 * Panel yang meluncur dari tepi untuk detail temuan. Tidak ada di Design.md;
 * diturunkan dari Modal (§ 7 > Modals): `surface`, `shadow-overlay`, scrim
 * `ink` 48%, padding space-8, tombol tutup 40px di kanan atas, fokus dijebak,
 * Escape menutup, trigger mendapat fokusnya kembali.
 *
 * Bedanya dengan Modal: radius hanya di sisi dalam (tepi luar menempel layar),
 * dan masuknya bergeser, bukan membesar - § 8 melarang skala kecuali pada
 * modal, dan geseran di sini menjelaskan asal panel.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: "right" | "left";
  size?: "md" | "lg";
};

function SheetContent({
  className,
  children,
  side = "right",
  size = "md",
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-overlay bg-ink/48",
          "duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        )}
      />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 z-modal flex w-full flex-col bg-surface shadow-overlay",
          size === "md" ? "max-w-[480px]" : "max-w-[640px]",
          side === "right"
            ? "right-0 rounded-l-xl border-l border-border"
            : "left-0 rounded-r-xl border-r border-border",
          "duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in",
          side === "right"
            ? "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
            : "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Tutup"
          className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-ink focus-ring"
        >
          <X className="size-4" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** Kepala sheet: menempel di atas saat isinya digulir. */
function SheetHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "sticky top-0 z-base flex flex-col gap-2 border-b border-border bg-surface px-8 py-6 pr-16",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn("text-title-lg text-ink", className)} {...props} />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-body-sm text-ink-secondary", className)}
      {...props}
    />
  );
}

/** Badan yang bisa digulir. */
function SheetBody({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex-1 overflow-y-auto px-8 py-6", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-border bg-surface px-8 py-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
};
