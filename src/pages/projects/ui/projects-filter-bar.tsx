import { CalendarClock, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { FacetFilter, SingleSelectFilter } from "@/shared/ui/facet-filter";
import { SearchInput } from "@/shared/ui/input";
import {
  EMPTY_PROJECT_FILTERS,
  SCHEDULE_OPTIONS,
  hasAnyFilter,
  type FacetOption,
  type ProjectFilters,
} from "../model/project-filters";

interface ProjectsFilterBarProps {
  filters: ProjectFilters;
  onChange: (next: ProjectFilters) => void;
  statusOptions: FacetOption[];
  clientOptions: FacetOption[];
  /** Jumlah baris setelah semua filter (termasuk pencarian). */
  resultCount: number;
  totalCount: number;
}

export function ProjectsFilterBar({
  filters,
  onChange,
  statusOptions,
  clientOptions,
  resultCount,
  totalCount,
}: ProjectsFilterBarProps) {
  const update = (patch: Partial<ProjectFilters>) => onChange({ ...filters, ...patch });
  const isFiltered = hasAnyFilter(filters);

  return (
    <div
      role="search"
      aria-label="Filter proyek"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      {/* Kiri: pencarian + total proyek */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SearchInput
          aria-label="Cari proyek"
          placeholder="Cari nama proyek atau klien"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="h-9 sm:w-72"
        />
        <p
          aria-live="polite"
          className="shrink-0 text-xs whitespace-nowrap text-ink-muted tabular-nums"
        >
          {isFiltered
            ? `Menampilkan ${resultCount} dari ${totalCount} proyek`
            : `${totalCount} proyek`}
        </p>
      </div>

      {/* Kanan: dropdown filter */}
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {isFiltered ? (
          <Button
            type="button"
            variant="quiet"
            onClick={() => onChange(EMPTY_PROJECT_FILTERS)}
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
        />
        <FacetFilter
          title="Klien"
          options={clientOptions}
          selected={filters.clients}
          onChange={(clients) => update({ clients })}
          emptyText="Belum ada data klien"
        />
        <SingleSelectFilter
          title="Jadwal"
          icon={<CalendarClock />}
          options={SCHEDULE_OPTIONS}
          value={filters.schedule}
          defaultValue="all"
          onChange={(schedule) => update({ schedule })}
        />
      </div>
    </div>
  );
}
