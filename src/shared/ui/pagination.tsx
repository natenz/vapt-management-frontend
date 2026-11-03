/**
 * Pagination — *(derived)*
 *
 * Spec § 7 > Tables tidak menyebut pagination, tapi tabel temuan tidak bisa
 * hidup tanpanya. Mengikuti aturan yang ada: kontrol setinggi space-10,
 * radius-sm, halaman aktif memakai pola nav (`surface-subtle` + label `brand`),
 * dan jumlah baris ditulis dengan angka tabular.
 *
 * Spec § 10 "Numbers in prose": jangan pernah menampilkan angka tanpa kata
 * bendanya - karena itu ringkasannya berbunyi "41-60 dari 113 temuan".
 */
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type PaginationProps = {
  page: number;
  pageCount: number;
  /** Total baris, untuk ringkasan. */
  total: number;
  pageSize: number;
  /** Kata benda yang dihitung, mis. "temuan". */
  noun: string;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Deret halaman dengan elipsis: 1 … 4 5 6 … 20 */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push("gap");
    out.push(p);
    previous = p;
  }
  return out;
}

function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  noun,
  onPageChange,
  className,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div
      className={cn("flex flex-wrap items-center justify-between gap-4 pt-4", className)}
    >
      <p className="text-caption text-ink-muted">
        <span className="tabular">
          {first}-{last}
        </span>{" "}
        dari <span className="tabular">{total}</span> {noun}
      </p>

      <nav aria-label="Navigasi halaman">
        <ul className="flex items-center gap-1">
          <li>
            <PageButton
              aria-label="Halaman sebelumnya"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </PageButton>
          </li>

          {pageWindow(page, pageCount).map((entry, i) =>
            entry === "gap" ? (
              <li key={`gap-${i}`} className="px-1 text-caption text-ink-disabled" aria-hidden>
                &hellip;
              </li>
            ) : (
              <li key={entry}>
                <PageButton
                  aria-label={`Halaman ${entry}`}
                  aria-current={entry === page ? "page" : undefined}
                  active={entry === page}
                  onClick={() => onPageChange(entry)}
                >
                  <span className="tabular">{entry}</span>
                </PageButton>
              </li>
            ),
          )}

          <li>
            <PageButton
              aria-label="Halaman berikutnya"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </PageButton>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function PageButton({
  active = false,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-sm text-button",
        "transition-colors duration-150 ease-out focus-ring",
        active
          ? "bg-surface-subtle text-brand"
          : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
        "disabled:pointer-events-none disabled:text-ink-disabled",
        className,
      )}
      {...props}
    />
  );
}

export { Pagination, pageWindow };
export type { PaginationProps };
