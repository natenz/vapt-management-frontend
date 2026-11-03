/**
 * Input — Design.md § Component Guidelines > Input
 *
 * "A 40px text field family: search, form field and select, built from the
 *  same rounded rectangle."
 *
 * Aturan yang dikodekan:
 *  - Control space-10 tinggi (h-10), radius-sm, 1px `border-control` — bukan
 *    `border`. Spec: border kontrol harus 3:1 "so it is findable without
 *    color". Inilah alasan --input di bridge shadcn menunjuk border-control.
 *  - Padding horizontal space-3, value style `input`, placeholder ink-muted.
 *  - Hover: border ink-secondary. Focus: border `focus` + shadow-focus.
 *  - Error: border `error`, ikon alert dan pesan di bawah — tidak pernah
 *    warna saja.
 *  - Disabled: fill surface-subtle, teks ink-disabled, border border-strong.
 *  - "Labels sit above fields, never as placeholders alone" — ditegakkan oleh
 *    <Field>, yang mewajibkan label dan menyambungkan id/aria sendiri.
 *
 * Catatan spec: § Input menulis label sebagai "`title-sm` at 14px", sementara
 * token `title-sm` bernilai 16px. Ukuran eksplisit 14px yang diambil, lewat
 * style `button` (14px / 500) yang bobotnya sama.
 */
import * as React from "react";
import { AlertCircle, Search } from "lucide-react";
import { cn } from "@/shared/lib/cn";

/* ------------------------------------------------------------------ *
 * Control
 * ------------------------------------------------------------------ */

const controlClasses = [
  "h-10 w-full rounded-sm border border-border-control bg-surface px-3",
  "text-input text-ink placeholder:text-ink-muted",
  "transition-[color,border-color,box-shadow] duration-150 ease-out",
  "hover:border-ink-secondary",
  "focus-visible:border-focus focus-ring",
  "disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-surface-subtle disabled:text-ink-disabled",
  // Spec: error tidak pernah mengandalkan warna saja — <Field> menambah ikon
  // dan pesan; di sini border-nya saja yang berubah.
  "aria-invalid:border-error",
];

type InputProps = React.ComponentPropsWithoutRef<"input">;

function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input data-slot="input" type={type} className={cn(controlClasses, className)} {...props} />
  );
}

/* ------------------------------------------------------------------ *
 * Label
 * ------------------------------------------------------------------ */

type LabelProps = React.ComponentPropsWithoutRef<"label">;

function Label({ className, ...props }: LabelProps) {
  return <label data-slot="label" className={cn("text-button text-ink", className)} {...props} />;
}

/* ------------------------------------------------------------------ *
 * Field — label + control + helper/error
 * ------------------------------------------------------------------ */

type FieldProps = {
  /** Wajib: spec melarang placeholder dipakai sebagai satu-satunya label. */
  label: string;
  /** Metadata singkat yang tampil sejajar dengan label, misalnya target tanggal. */
  labelMeta?: React.ReactNode;
  /** Teks bantuan; disembunyikan saat ada error. */
  helper?: string;
  /** Pesan error. Kehadirannya menandai field invalid. */
  error?: string;
  /** Render prop untuk control-nya, menerima props aksesibilitas yang sudah dirangkai. */
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
  className?: string;
};

/**
 * Merangkai id, aria-invalid dan aria-describedby sendiri supaya tidak ada
 * field yang tayang tanpa label atau tanpa pesan error yang terbaca screen
 * reader. Jarak label ke control space-2 (§ Input).
 */
function Field({ label, labelMeta, helper, error, children, className }: FieldProps) {
  const id = React.useId();
  const messageId = `${id}-message`;
  const invalid = Boolean(error);
  const message = error ?? helper;

  return (
    <div data-slot="field" className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label htmlFor={id}>{label}</Label>
        {labelMeta ? <span className="text-caption text-ink-muted">{labelMeta}</span> : null}
      </div>
      {children({
        id,
        "aria-invalid": invalid || undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message ? (
        <p
          id={messageId}
          className={cn(
            "flex animate-form-feedback-in items-center gap-1.5 text-caption",
            invalid ? "text-error" : "text-ink-muted",
          )}
        >
          {invalid ? <AlertCircle className="size-3.5 shrink-0" aria-hidden /> : null}
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Jarak antar field. Spec § Input: "Field to field gap is space-4."
 */
function FieldGroup({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div data-slot="field-group" className={cn("flex flex-col gap-4", className)} {...props} />
  );
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

type SearchInputProps = Omit<InputProps, "type"> & {
  /**
   * Wajib: search tidak punya label terlihat, jadi butuh nama aksesibel
   * (§ Input: "A search input needs an accessible name").
   */
  "aria-label": string;
  /**
   * Varian di atas banner gelap: putih tanpa border terlihat, maksimum 450px,
   * focus ring memakai gap surface-inverse.
   */
  onDark?: boolean;
};

function SearchInput({ className, onDark = false, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", onDark && "mx-auto w-full max-w-[450px]")}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
        aria-hidden
      />
      <Input
        type="search"
        className={cn(
          "pl-9",
          onDark && "border-transparent focus-ring-inverse hover:border-transparent",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export { Input, Label, Field, FieldGroup, SearchInput };
export type { InputProps, LabelProps, FieldProps, SearchInputProps };
