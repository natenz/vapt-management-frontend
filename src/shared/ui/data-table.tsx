/**
 * DataTable — Design.md § 7 > Tables  *(derived)*
 *
 * Menyatukan logic TanStack Table dengan primitif Table yang sudah mengikuti
 * spec. Tidak ada markup tabel baru di sini — semuanya lewat `Table`,
 * `TableRow`, `TableCell` yang aturannya sudah dikunci (header 48px overline,
 * baris 56px, hairline, tanpa zebra, angka rata kanan tabular).
 *
 * Loading memakai skeleton pada BENTUK AKHIR tabel (§ 8: "skeletons at final
 * shape. No full-page blockers"), bukan spinner di tengah layar.
 */
import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Pagination } from "@/shared/ui/pagination";
import { SkeletonRow } from "@/shared/ui/skeleton";

/**
 * Kolom boleh menandai dirinya numerik lewat `meta`, supaya perataan kanan
 * dan angka tabular ditentukan sekali di definisi kolom, bukan di tiap sel.
 */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    numeric?: boolean;
    /** Sembunyikan header secara visual tapi tetap ada untuk screen reader. */
    srOnlyHeader?: boolean;
  }
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  /** Kata benda untuk ringkasan pagination, mis. "temuan". */
  noun: string;
  /** Nama tabel untuk pembaca layar. */
  caption?: string;
  /** Teks pencarian global; dikendalikan pemanggil supaya bisa dibagi dengan filter lain. */
  globalFilter?: string;
  initialSorting?: SortingState;
  pageSize?: number;
  isLoading?: boolean;
  /** Ditampilkan saat tidak ada baris dan tidak sedang memuat. */
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  /** Nama aksi baris untuk pengguna pembaca layar. */
  getRowAriaLabel?: (row: TData) => string;
  /** Menandai baris yang sedang dipilih (mis. detail sedang terbuka). */
  selectedRowId?: string;
  getRowId?: (row: TData) => string;
  className?: string;
};

function DataTable<TData>({
  columns,
  data,
  noun,
  caption,
  globalFilter = "",
  initialSorting = [],
  pageSize = 20,
  isLoading = false,
  emptyState,
  onRowClick,
  getRowAriaLabel,
  selectedRowId,
  getRowId,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [pageIndex, setPageIndex] = React.useState(0);

  // Filter yang berubah harus mengembalikan pembaca ke halaman pertama —
  // kalau tidak, hasil yang menyusut terlihat seperti "tidak ada data".
  React.useEffect(() => {
    setPageIndex(0);
  }, [globalFilter, data]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: getRowId as ((row: TData, index: number) => string) | undefined,
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className={cn("flex flex-col", className)}>
      <Table boxed>
        {caption ? <TableCaption className="sr-only">{caption}</TableCaption> : null}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();

                return (
                  <TableHead
                    key={header.id}
                    numeric={meta?.numeric}
                    sort={canSort ? (sorted === false ? false : sorted) : undefined}
                    onSort={canSort ? () => header.column.toggleSorting() : undefined}
                    style={header.getSize() === 150 ? undefined : { width: header.getSize() }}
                  >
                    <span className={meta?.srOnlyHeader ? "sr-only" : undefined}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {Array.from({ length: 6 }, (_, i) => (
                  <SkeletonRow key={i} columns={Math.min(columns.length, 5)} />
                ))}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyState}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                selected={selectedRowId !== undefined && row.id === selectedRowId}
                aria-label={onRowClick ? getRowAriaLabel?.(row.original) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={
                  onRowClick
                    ? (event) => {
                        const target = event.target;
                        const interactive =
                          target instanceof Element &&
                          target.closest(
                            "a, button, input, select, textarea, [role='button'], [role='link']",
                          );
                        if (!interactive) onRowClick(row.original);
                      }
                    : undefined
                }
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                className={onRowClick ? "cursor-pointer focus-ring" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} numeric={cell.column.columnDef.meta?.numeric}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {isLoading || total === 0 ? null : (
        <Pagination
          page={pageIndex + 1}
          pageCount={Math.max(1, Math.ceil(total / pageSize))}
          total={total}
          pageSize={pageSize}
          noun={noun}
          onPageChange={(page) => setPageIndex(page - 1)}
        />
      )}
    </div>
  );
}

export { DataTable };
export type { DataTableProps };
