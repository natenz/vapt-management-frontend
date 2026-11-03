/**
 * Timeline — *(derived)*
 *
 * Tidak ada di Design.md; spec tidak mengenal riwayat peristiwa. Diturunkan
 * dari aturan yang ADA:
 *
 *  - Baris riwayat dipisah ruang dan hairline, bukan kartu bertumpuk (§ 6).
 *  - Penanda tidak boleh mengandalkan warna saja, jadi status dibedakan BENTUK:
 *    titik terisi (selesai), cincin (berjalan), lingkaran kosong (belum) —
 *    aturan yang sama dipakai `StatusIndicator`.
 *  - Judul `title-sm`, keterangan `body-sm` ink-secondary, waktu `caption`
 *    ink-muted (§ 3).
 *  - Item yang bisa dibuka adalah tombol sungguhan dengan focus-ring, bukan div
 *    ber-onClick, supaya tetap terjangkau keyboard (§ 8).
 *
 * Rel penghubung dibuat dari kolom flex yang meregang mengikuti tinggi baris,
 * bukan garis absolut ber-offset piksel. Dengan begitu isi sepanjang apa pun
 * tetap tersambung tanpa angka ajaib.
 */
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type TimelineMarkerTone = "done" | "current" | "todo";

const MARKER_SHAPE: Record<TimelineMarkerTone, string> = {
  // Terisi penuh: sudah lewat.
  done: "bg-surface-brand border-surface-brand",
  // Cincin: sedang berlangsung.
  current: "bg-bg border-surface-brand border-2",
  // Kosong: belum terjadi.
  todo: "bg-bg border-border-strong",
};

function Timeline({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn("flex flex-col", className)}>{children}</ol>;
}

type TimelineItemProps = {
  title: ReactNode;
  /** Waktu atau pelaku; satu baris `caption`. */
  meta?: ReactNode;
  children?: ReactNode;
  tone?: TimelineMarkerTone;
  /** Item terakhir tidak menggambar rel penghubung ke bawah. */
  last?: boolean;
  /** Bila diisi, seluruh isi jadi tombol yang bisa dibuka. */
  onSelect?: () => void;
  className?: string;
};

function TimelineItem({
  title,
  meta,
  children,
  tone = "done",
  last = false,
  onSelect,
  className,
}: TimelineItemProps) {
  const body = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-title-sm text-ink">{title}</p>
        {meta ? <p className="text-caption text-ink-muted">{meta}</p> : null}
      </div>
      {children ? <div className="mt-1 max-w-copy text-body-sm text-ink-secondary">{children}</div> : null}
    </>
  );

  return (
    <li data-slot="timeline-item" className={cn("flex gap-4", className)}>
      <div className="flex shrink-0 flex-col items-center" aria-hidden>
        <span className={cn("mt-1.5 size-3 rounded-full border", MARKER_SHAPE[tone])} />
        {last ? null : <span className="w-px flex-1 bg-border" />}
      </div>

      <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
        {onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            className="w-full rounded-sm px-2 py-1 text-left transition-colors duration-150 ease-out hover:bg-surface-subtle focus-ring"
          >
            {body}
          </button>
        ) : (
          <div className="px-2 py-1">{body}</div>
        )}
      </div>
    </li>
  );
}

export { Timeline, TimelineItem };
export type { TimelineItemProps, TimelineMarkerTone };
