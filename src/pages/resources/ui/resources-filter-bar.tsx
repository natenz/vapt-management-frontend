import { Calendar, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FacetFilter, type FacetOption } from "@/shared/ui/facet-filter";
import { SearchInput } from "@/shared/ui/input";
import {
  hasAnyFilter,
  type ResourceFilters,
} from "../model/resource-filters";

interface ResourcesFilterBarProps {
  filters: ResourceFilters;
  defaultMonth: string;
  onChange: (next: ResourceFilters) => void;
  roleOptions: FacetOption[];
  resultCount: number;
  totalCount: number;
}

export function ResourcesFilterBar({
  filters,
  defaultMonth,
  onChange,
  roleOptions,
  resultCount,
  totalCount,
}: ResourcesFilterBarProps) {
  const update = (patch: Partial<ResourceFilters>) => onChange({ ...filters, ...patch });
  const isFiltered = hasAnyFilter(filters, defaultMonth);

  return (
    <div
      role="search"
      aria-label="Filter resource"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      {/* Kiri: pencarian + total orang */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SearchInput
          aria-label="Cari resource"
          placeholder="Cari nama, username, role, atau departemen"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="h-9 sm:w-80"
        />
        <p
          aria-live="polite"
          className="shrink-0 text-xs whitespace-nowrap text-ink-muted tabular-nums"
        >
          {isFiltered
            ? `Menampilkan ${resultCount} dari ${totalCount} orang`
            : `${totalCount} orang`}
        </p>
      </div>

      {/* Kanan: filter bulan, faset, dan reset */}
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {isFiltered ? (
          <Button
            type="button"
            variant="quiet"
            onClick={() => onChange({ search: "", roles: [], month: defaultMonth })}
            className="h-9 gap-1.5 px-2.5 text-xs"
          >
            <X aria-hidden />
            Reset filter
          </Button>
        ) : null}

        <div className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1 text-caption text-ink-muted">
          <Calendar className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
          <span className="sr-only">Bulan:</span>
          <input
            type="month"
            aria-label="Pilih bulan"
            value={filters.month}
            onChange={(e) => e.target.value && update({ month: e.target.value })}
            className="bg-transparent text-xs text-ink focus:outline-none"
          />
        </div>

        <FacetFilter
          title="Role"
          options={roleOptions}
          selected={filters.roles}
          onChange={(roles) => update({ roles })}
          emptyText="Belum ada data role"
        />
      </div>
    </div>
  );
}
