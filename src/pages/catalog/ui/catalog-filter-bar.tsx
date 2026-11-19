import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FacetFilter, type FacetOption } from "@/shared/ui/facet-filter";
import { SearchInput } from "@/shared/ui/input";
import {
  EMPTY_CATALOG_FILTERS,
  hasAnyFilter,
  type CatalogFilters,
} from "../model/catalog-filters";

interface CatalogFilterBarProps {
  filters: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
  severityOptions: FacetOption[];
  /** Kata benda untuk ringkasan jumlah, mis. "kerentanan". */
  noun?: string;
  resultCount: number;
  totalCount: number;
}

export function CatalogFilterBar({
  filters,
  onChange,
  severityOptions,
  noun = "kerentanan",
  resultCount,
  totalCount,
}: CatalogFilterBarProps) {
  const update = (patch: Partial<CatalogFilters>) => onChange({ ...filters, ...patch });
  const isFiltered = hasAnyFilter(filters);

  return (
    <div
      role="search"
      aria-label="Filter katalog kerentanan"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      {/* Kiri: pencarian + total data */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SearchInput
          aria-label="Cari kerentanan"
          placeholder="Cari judul atau rekomendasi..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="h-9 sm:w-80"
        />
        <p
          aria-live="polite"
          className="shrink-0 text-xs whitespace-nowrap text-ink-muted tabular-nums"
        >
          {isFiltered
            ? `Menampilkan ${resultCount} dari ${totalCount} ${noun}`
            : `${totalCount} ${noun}`}
        </p>
      </div>

      {/* Kanan: reset + filter severity */}
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {isFiltered ? (
          <Button
            type="button"
            variant="quiet"
            onClick={() => onChange(EMPTY_CATALOG_FILTERS)}
            className="h-9 gap-1.5 px-2.5 text-xs"
          >
            <X aria-hidden />
            Reset filter
          </Button>
        ) : null}
        <FacetFilter
          title="Severity"
          options={severityOptions}
          selected={filters.severities}
          onChange={(severities) => update({ severities })}
          emptyText="Belum ada data severity"
        />
      </div>
    </div>
  );
}
