import type { CatalogVulna } from "@/entities/catalog";
import { SEVERITIES } from "@/entities/finding";
import type { FacetOption } from "@/shared/ui/facet-filter";

export interface CatalogFilters {
  search: string;
  severities: string[];
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  search: "",
  severities: [],
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

const PARAM = { search: "q", severities: "severity" } as const;
const PAGE_SIZE_PARAM = "per";
const VIEW_PARAM = "status";

/**
 * Status katalog yang sedang ditampilkan. Bukan bagian dari filter yang
 * di-reset: "Reset filter" hanya membersihkan pencarian & severity.
 */
export type CatalogView = "approved" | "pending" | "submissions";

export function parseCatalogView(
  params: URLSearchParams,
  allowed: readonly CatalogView[],
): CatalogView {
  const value = params.get(VIEW_PARAM) as CatalogView | null;
  return value && allowed.includes(value) ? value : "approved";
}

export function writeCatalogView(view: CatalogView, base: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(base);
  if (view === "approved") next.delete(VIEW_PARAM);
  else next.set(VIEW_PARAM, view);
  return next;
}

export function parsePageSize(params: URLSearchParams): number {
  const value = Number(params.get(PAGE_SIZE_PARAM));
  return PAGE_SIZE_OPTIONS.includes(value) ? value : DEFAULT_PAGE_SIZE;
}

export function writePageSize(pageSize: number, base: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(base);
  if (pageSize === DEFAULT_PAGE_SIZE) next.delete(PAGE_SIZE_PARAM);
  else next.set(PAGE_SIZE_PARAM, String(pageSize));
  return next;
}

const splitList = (raw: string | null) =>
  raw
    ? raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];

export function parseCatalogFilters(params: URLSearchParams): CatalogFilters {
  return {
    search: params.get(PARAM.search) ?? "",
    severities: splitList(params.get(PARAM.severities)),
  };
}

export function writeCatalogFilters(
  filters: CatalogFilters,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set(PARAM.search, filters.search.trim());
  set(PARAM.severities, filters.severities.join(","));
  return next;
}

export function countActiveFilters(filters: CatalogFilters): number {
  return filters.severities.length > 0 ? 1 : 0;
}

export function hasAnyFilter(filters: CatalogFilters): boolean {
  return countActiveFilters(filters) > 0 || filters.search.trim() !== "";
}

export function matchesSearch(item: CatalogVulna, search: string): boolean {
  const query = search.trim().toLocaleLowerCase("id");
  if (!query) return true;
  const title = item.title.toLocaleLowerCase("id");
  const rec = (item.remediation_recommendation ?? "").toLocaleLowerCase("id");
  const desc = (item.description ?? "").toLocaleLowerCase("id");
  return title.includes(query) || rec.includes(query) || desc.includes(query);
}

export function applyCatalogFilters(
  items: CatalogVulna[],
  filters: CatalogFilters,
): CatalogVulna[] {
  const sevs = new Set(filters.severities.map((s) => s.toLowerCase()));
  return items.filter(
    (c) =>
      matchesSearch(c, filters.search) &&
      (sevs.size === 0 || sevs.has(c.severity.toLowerCase())),
  );
}

export function getSeverityOptions(items: CatalogVulna[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const c of items) {
    const s = c.severity;
    if (s) {
      const key = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return SEVERITIES.map((value) => ({
    value,
    count: counts.get(value) ?? 0,
  }));
}
