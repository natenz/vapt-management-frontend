/**
 * Table — Design.md § 7 Component Language > Tables  *(derived)*
 *
 * "Header row: `overline` style in `ink-muted`, 48px tall. Rows: 56px,
 *  separated by a 1px `border`, no zebra, no outer box (or one `radius-md`
 *  border around the whole table). Cell padding `space-4` horizontal.
 *  Numbers right-aligned in tabular figures. Row hover `surface-subtle`;
 *  selected `brand-soft`. Sortable headers show a 16px chevron."
 *
 * Ini lapisan presentasi saja — tanpa state. Logic sort/filter/paginate
 * masuk di ronde berikutnya lewat TanStack Table; markup-nya sudah siap
 * menerima itu (TableHead punya prop `sort`).
 */
import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type TableProps = React.ComponentPropsWithoutRef<"table"> & {
  /** Membungkus tabel dengan satu border radius-md, alternatif yang diizinkan spec. */
  boxed?: boolean;
};

function Table({ className, boxed = false, ...props }: TableProps) {
  return (
    <div
      data-slot="table-wrapper"
      className={cn("w-full overflow-x-auto", boxed && "rounded-md border border-border")}
    >
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-left", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-b border-border", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentPropsWithoutRef<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

type TableRowProps = React.ComponentPropsWithoutRef<"tr"> & {
  selected?: boolean;
};

function TableRow({ className, selected = false, ...props }: TableRowProps) {
  return (
    <tr
      data-slot="table-row"
      data-selected={selected || undefined}
      className={cn(
        // Tanpa zebra: pemisah hanya hairline.
        "h-14 border-b border-border transition-colors duration-150 ease-out last:border-b-0",
        selected ? "bg-brand-soft" : "hover:bg-surface-subtle",
        className,
      )}
      {...props}
    />
  );
}

type SortDirection = "asc" | "desc" | false;

type TableHeadProps = Omit<React.ComponentPropsWithoutRef<"th">, "onClick"> & {
  /** Angka rata kanan. */
  numeric?: boolean;
  /**
   * Menyalakan header sortable. `false` berarti kolom bisa di-sort tapi
   * sedang tidak aktif; undefined berarti kolom tidak sortable.
   */
  sort?: SortDirection;
  onSort?: () => void;
};

function TableHead({
  className,
  numeric = false,
  sort,
  onSort,
  children,
  ...props
}: TableHeadProps) {
  const sortable = sort !== undefined;
  const SortIcon = sort === "asc" ? ChevronUp : sort === "desc" ? ChevronDown : ChevronsUpDown;

  return (
    <th
      data-slot="table-head"
      scope="col"
      aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
      className={cn(
        "h-12 px-4 text-overline text-ink-muted uppercase",
        numeric && "text-right",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xs transition-colors duration-150 ease-out hover:text-ink focus-ring",
            numeric && "flex-row-reverse",
          )}
        >
          {children}
          <SortIcon className={cn("size-4 shrink-0", !sort && "text-ink-disabled")} aria-hidden />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

type TableCellProps = React.ComponentPropsWithoutRef<"td"> & {
  /** Rata kanan + angka tabular (§ 13: "tabular figures when values change"). */
  numeric?: boolean;
};

function TableCell({ className, numeric = false, ...props }: TableCellProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 text-body-sm text-ink", numeric && "text-right tabular", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentPropsWithoutRef<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("pb-4 text-left text-caption text-ink-muted", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption };
export type { TableProps, TableRowProps, TableHeadProps, TableCellProps, SortDirection };
