import type { ResourceLoad } from "@/entities/project";
import type { User } from "@/entities/user";
import { ROLE_LABEL, isRole, type RoleName } from "@/shared/config/roles";
import type { FacetOption } from "@/shared/ui/facet-filter";

export type ResourceRow = { user: User; load: ResourceLoad };

export interface ResourceFilters {
  search: string;
  roles: string[];
  month: string;
}

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

const PARAM = { search: "q", roles: "role", month: "bulan" } as const;
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

export function parseResourceFilters(
  params: URLSearchParams,
  defaultMonth: string,
): ResourceFilters {
  return {
    search: params.get(PARAM.search) ?? "",
    roles: splitList(params.get(PARAM.roles)),
    month: params.get(PARAM.month) ?? defaultMonth,
  };
}

export function writeResourceFilters(
  filters: ResourceFilters,
  defaultMonth: string,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set(PARAM.search, filters.search.trim());
  set(PARAM.roles, filters.roles.join(","));
  if (filters.month && filters.month !== defaultMonth) {
    next.set(PARAM.month, filters.month);
  } else {
    next.delete(PARAM.month);
  }
  return next;
}

export function countActiveFilters(filters: ResourceFilters, defaultMonth: string): number {
  return (filters.roles.length > 0 ? 1 : 0) + (filters.month !== defaultMonth ? 1 : 0);
}

export function hasAnyFilter(filters: ResourceFilters, defaultMonth: string): boolean {
  return countActiveFilters(filters, defaultMonth) > 0 || filters.search.trim() !== "";
}

export function matchesSearch(row: ResourceRow, search: string): boolean {
  const query = search.trim().toLocaleLowerCase("id");
  if (!query) return true;
  const name = (row.user.profile?.full_name ?? "").toLocaleLowerCase("id");
  const username = row.user.username.toLocaleLowerCase("id");
  const dept = (row.user.profile?.department ?? "").toLocaleLowerCase("id");
  const role = (row.user.role?.role_name ?? "").toLocaleLowerCase("id");
  const roleLabel = (isRole(role) ? ROLE_LABEL[role as RoleName] : role).toLocaleLowerCase("id");
  const projects = row.load.projects.map((p) => p.name.toLocaleLowerCase("id")).join(" ");
  return (
    name.includes(query) ||
    username.includes(query) ||
    dept.includes(query) ||
    role.includes(query) ||
    roleLabel.includes(query) ||
    projects.includes(query)
  );
}

export function applyResourceFilters(
  rows: ResourceRow[],
  filters: ResourceFilters,
): ResourceRow[] {
  const roles = new Set(filters.roles);
  return rows.filter(
    (r) =>
      matchesSearch(r, filters.search) &&
      (roles.size === 0 || roles.has(r.user.role?.role_name ?? "")),
  );
}

export function getResourceRoleOptions(rows: ResourceRow[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const role = r.user.role?.role_name;
    if (role) counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  const order: RoleName[] = ["pentester", "technical_writer", "project_manager"];
  return order
    .filter((role) => counts.has(role))
    .map((value) => ({
      value,
      label: isRole(value) ? ROLE_LABEL[value] : value,
      count: counts.get(value) ?? 0,
    }));
}
