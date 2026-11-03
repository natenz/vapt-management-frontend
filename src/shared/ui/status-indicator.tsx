/**
 * StatusIndicator — Design.md § 7 Component Language > Status indicators  *(derived)*
 *
 * "An 8px dot (`radius-full`) in a status color, always followed by its label
 *  in `ink`. Do not use color alone; use a shape variant (filled dot, ring,
 *  triangle) for the second cue. No animation on static status; a 1.5s soft
 *  pulse is allowed only on a live-connection dot."
 *
 * Bentuk adalah petunjuk kedua, jadi tiap tone punya bentuknya sendiri:
 *   success  titik penuh
 *   info     cincin
 *   warning  segitiga
 *   error    titik penuh dengan cincin di luarnya
 *
 * Label wajib — tidak ada cara memanggil komponen ini tanpa kata.
 */
import * as React from "react";
import { cn } from "@/shared/lib/cn";

type StatusTone = "success" | "info" | "warning" | "error";

type StatusIndicatorProps = {
  tone: StatusTone;
  /** Wajib: kata yang menyebut statusnya. */
  children: React.ReactNode;
  /** Hanya untuk dot koneksi live. Spec melarang animasi pada status statis. */
  live?: boolean;
  className?: string;
};

function StatusIndicator({ tone, children, live = false, className }: StatusIndicatorProps) {
  return (
    <span
      data-slot="status-indicator"
      data-tone={tone}
      className={cn("inline-flex items-center gap-2 text-body-sm text-ink", className)}
    >
      <Shape tone={tone} live={live} />
      {children}
    </span>
  );
}

function Shape({ tone, live }: { tone: StatusTone; live: boolean }) {
  const pulse = live ? "animate-live-pulse" : "";

  if (tone === "warning") {
    // Segitiga, digambar dengan border supaya ikut warna token.
    return (
      <span
        aria-hidden
        className={cn(
          "size-0 shrink-0 border-x-4 border-b-[7px] border-x-transparent border-b-warning",
          pulse,
        )}
      />
    );
  }

  if (tone === "info") {
    // Cincin.
    return (
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full border-2 border-info", pulse)} />
    );
  }

  if (tone === "error") {
    // Titik penuh dengan halo — dua isyarat bentuk sekaligus.
    return (
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full bg-error ring-2 ring-error-border", pulse)}
      />
    );
  }

  // success: titik penuh 8px.
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full bg-success", pulse)} />;
}

export { StatusIndicator };
export type { StatusIndicatorProps, StatusTone };
