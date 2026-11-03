/**
 * Alert — Design.md § Component Guidelines > Alert  *(derived)*
 *
 * "An inline message in a tinted, hairline-bordered box with a status icon,
 *  a title, one or two lines of body and an optional action."
 *
 * Aturan yang dikodekan:
 *  - radius-md, 1px border status, ground status `-bg`, padding space-4,
 *    ikon 20px di kiri dengan gap space-3.
 *  - Judul `title-sm` ink, body `body-sm` ink-secondary.
 *  - "Always icon + a word" — ikon dirender dari peta internal, tidak bisa
 *    dimatikan pemanggil.
 *  - "Because the brand is red, error never relies on hue: it uses
 *    `alert-circle`, the word 'Error' and `error-bg`."
 *  - "Info uses neutral slate, not a new hue" — tone info memakai token
 *    `info` (slate netral), bukan biru baru.
 *
 * Alert bersifat inline dan bertahan sampai persoalannya selesai. Konfirmasi
 * sesaat adalah urusan toast (lihat shared/components/toast.tsx) dan tidak
 * pernah berupa error.
 */
import * as React from "react";
import { AlertCircle, AlertTriangle, Check, Info, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type AlertTone = "info" | "success" | "warning" | "error";

const TONE_META: Record<
  AlertTone,
  { icon: React.ComponentType<{ className?: string }>; className: string; iconClass: string }
> = {
  info: {
    icon: Info,
    className: "border-info-border bg-info-bg",
    iconClass: "text-info",
  },
  success: {
    // Spec § Badge: satu-satunya ikon solid yang diizinkan adalah check kecil
    // di dalam status success.
    icon: Check,
    className: "border-success-border bg-success-bg",
    iconClass: "text-success",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-warning-border bg-warning-bg",
    iconClass: "text-warning",
  },
  error: {
    icon: AlertCircle,
    className: "border-error-border bg-error-bg",
    iconClass: "text-error",
  },
};

type AlertProps = Omit<React.ComponentPropsWithoutRef<"div">, "title"> & {
  tone?: AlertTone;
  /** Wajib: kalimat yang menyebut hasilnya, mis. "Error: impor gagal". */
  title: React.ReactNode;
  /** Maksimal dua baris. */
  children?: React.ReactNode;
  /** Text link brand dengan arrow. */
  action?: React.ReactNode;
  /** Menampilkan tombol tutup di kanan atas. */
  onDismiss?: () => void;
  /** Mengurangi ukuran alert untuk pesan singkat pada form. */
  compact?: boolean;
};

function Alert({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
  compact = false,
  className,
  ...props
}: AlertProps) {
  const meta = TONE_META[tone];
  const Icon = meta.icon;

  return (
    <div
      data-slot="alert"
      data-tone={tone}
      // Error diumumkan segera; sisanya sopan.
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex rounded-md border",
        compact ? "items-center gap-2 px-3 py-2.5" : "gap-3 p-4",
        meta.className,
        className,
      )}
      {...props}
    >
      <Icon
        className={cn(compact ? "size-4" : "mt-0.5 size-5", "shrink-0", meta.iconClass)}
        aria-hidden
      />

      <div className={cn("flex min-w-0 flex-1 flex-col", compact ? "gap-0" : "gap-1")}>
        <p className={cn(compact ? "text-body-sm font-medium" : "text-title-sm", "text-ink")}>
          {title}
        </p>
        {children ? <div className="text-body-sm text-ink-secondary">{children}</div> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>

      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup pesan"
          className={cn(
            "shrink-0 rounded-xs p-1 text-ink-muted focus-ring transition-[color,transform] duration-150 ease-out hover:text-ink active:scale-90",
            compact ? "self-center" : "-mt-1 -mr-1 self-start",
          )}
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export { Alert, TONE_META as ALERT_TONE_META };
export type { AlertProps, AlertTone };
