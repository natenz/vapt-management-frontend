/**
 * Dialog (Modal) — Design.md § 7 Component Language > Modals  *(derived)*
 *
 * "A `surface` panel at `radius-xl`, `shadow-overlay`, 480 or 640px wide,
 *  `space-8` padding, over a scrim of `ink` at 48%. Title `title-lg`, body
 *  `body`, footer actions right-aligned (Quiet cancel, Outline or Solid
 *  confirm). Close button top-right with a 40px target. Focus is trapped;
 *  Escape closes; the trigger regains focus. Enter with a 200ms fade and
 *  2% scale."
 *
 * Focus trap, Escape, dan pengembalian fokus ke trigger ditangani Radix.
 * Skala 2% saat masuk adalah satu-satunya tempat sistem ini mengizinkan
 * scale — § 8 melarangnya untuk hover.
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        // Scrim: ink pada 48%.
        "fixed inset-0 z-overlay bg-ink/48",
        "duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** Dua lebar yang diizinkan spec. */
  size?: "sm" | "lg";
};

function DialogContent({ className, children, size = "sm", ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-modal w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
          size === "sm" ? "max-w-[480px]" : "max-w-[640px]",
          "rounded-xl border border-border bg-surface p-8 shadow-overlay",
          // Masuk: fade 200ms + skala 2%.
          "duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Tutup"
          // Target 40px penuh (space-10) meski ikonnya 16px.
          className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-ink focus-ring"
        >
          <X className="size-4" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 pr-10", className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-title-lg text-ink", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body text-ink-secondary", className)}
      {...props}
    />
  );
}

/** Aksi rata kanan: Quiet untuk batal, Outline/Solid untuk konfirmasi. */
function DialogFooter({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("mt-8 flex flex-wrap justify-end gap-3", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
export type { DialogContentProps };
