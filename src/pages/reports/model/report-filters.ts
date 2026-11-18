import type { Project } from "@/entities/project";
import type { FacetOption } from "@/shared/ui/facet-filter";

export interface ReportFilters {
  search: string;
  statuses: string[];
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  search: "",
  statuses: [],
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

const PARAM = { search: "q", statuses: "status" } as const;
const PAGE_SIZE_PARAM = "per";

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

export function parseReportFilters(params: URLSearchParams): ReportFilters {
  return {
    search: params.get(PARAM.search) ?? "",
    statuses: splitList(params.get(PARAM.statuses)),
  };
}

export function writeReportFilters(
  filters: ReportFilters,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set(PARAM.search, filters.search.trim());
  set(PARAM.statuses, filters.statuses.join(","));
  return next;
}

export function countActiveFilters(filters: ReportFilters): number {
  return filters.statuses.length > 0 ? 1 : 0;
}

export function hasAnyFilter(filters: ReportFilters): boolean {
  return countActiveFilters(filters) > 0 || filters.search.trim() !== "";
}

export function matchesSearch(project: Project, search: string): boolean {
  const query = search.trim().toLocaleLowerCase("id");
  if (!query) return true;
  const name = project.project_name.toLocaleLowerCase("id");
  const client = (project.client_name ?? "").toLocaleLowerCase("id");
  return name.includes(query) || client.includes(query);
}

export function applyReportFilters(projects: Project[], filters: ReportFilters): Project[] {
  const statuses = new Set(filters.statuses);
  return projects.filter(
    (p) =>
      matchesSearch(p, filters.search) &&
      (statuses.size === 0 || statuses.has(p.status?.status_name ?? "")),
  );
}

export function getReportStatusOptions(projects: Project[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const p of projects) {
    const s = p.status?.status_name;
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({
    value,
    count,
  }));
}
