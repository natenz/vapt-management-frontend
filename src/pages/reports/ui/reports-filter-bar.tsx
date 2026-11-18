import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FacetFilter, type FacetOption } from "@/shared/ui/facet-filter";
import { SearchInput } from "@/shared/ui/input";
import {
  EMPTY_REPORT_FILTERS,
  hasAnyFilter,
  type ReportFilters,
} from "../model/report-filters";

interface ReportsFilterBarProps {
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  statusOptions: FacetOption[];
  resultCount: number;
  totalCount: number;
}

export function ReportsFilterBar({
  filters,
  onChange,
  statusOptions,
  resultCount,
  totalCount,
}: ReportsFilterBarProps) {
  const update = (patch: Partial<ReportFilters>) => onChange({ ...filters, ...patch });
  const isFiltered = hasAnyFilter(filters);

  return (
    <div
      role="search"
      aria-label="Filter laporan proyek"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      {/* Kiri: pencarian + total laporan */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SearchInput
          aria-label="Cari proyek laporan"
          placeholder="Cari nama proyek atau klien..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="h-9 sm:w-80"
        />
        <p
          aria-live="polite"
          className="shrink-0 text-xs whitespace-nowrap text-ink-muted tabular-nums"
        >
          {isFiltered
            ? `Menampilkan ${resultCount} dari ${totalCount} laporan`
            : `${totalCount} laporan`}
        </p>
      </div>

      {/* Kanan: filter faset status */}
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {isFiltered ? (
          <Button
            type="button"
            variant="quiet"
            onClick={() => onChange(EMPTY_REPORT_FILTERS)}
            className="h-9 gap-1.5 px-2.5 text-xs"
          >
            <X aria-hidden />
            Reset filter
          </Button>
        ) : null}
        <FacetFilter
          title="Status"
          options={statusOptions}
          selected={filters.statuses}
          onChange={(statuses) => update({ statuses })}
          emptyText="Belum ada data status"
        />
      </div>
    </div>
  );
}
