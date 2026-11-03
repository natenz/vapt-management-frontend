/**
 * Popover — *(derived)*
 *
 * Design.md tidak menyebut popover sebagai komponen, tapi tabel elevasi § 6
 * sudah memberinya aturan: "Menu/popover = 1px `border` + `shadow-raised`".
 * Panel ini karena itu memakai anatomi yang sama dengan menu — dan memang
 * berbagi kelas `menuPanelClasses` dengan Select dan DropdownMenu, supaya
 * ketiganya tidak pernah berbeda sendiri-sendiri.
 *
 * Bedanya dari `Dialog`: popover menempel pada elemen yang memicunya dan tidak
 * memasang scrim. Dipakai untuk detail sebuah objek di tempatnya berada —
 * misalnya satu batang di linimasa Gantt — di mana kehilangan konteks di
 * sekitarnya justru merugikan.
 *
 * Berbeda dari `Tooltip`, isinya boleh diklik dan bisa memuat tombol, jadi ia
 * memang harus popover, bukan tooltip yang dipaksa.
 *
 * Gerak masuk 200ms ease-out sesuai aturan disclosure § 8; keluar 150ms.
 */
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-overlay w-80 rounded-md border border-border bg-surface p-4 shadow-raised",
          "duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

/**
 * Tombol tutup 40px di pojok panel.
 *
 * Radix sudah menutup panel lewat Escape dan klik di luar, tapi keduanya tidak
 * terlihat. Spec § 8 mensyaratkan target sentuh minimal 40px, jadi tombolnya
 * berukuran penuh meski ikonnya 16px.
 */
function PopoverClose({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Close>) {
  return (
    <PopoverPrimitive.Close
      aria-label="Tutup"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-ink-muted",
        "transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-ink focus-ring",
        className,
      )}
      {...props}
    >
      <X className="size-4" aria-hidden />
    </PopoverPrimitive.Close>
  );
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent, PopoverClose };
