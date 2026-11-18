import type { User } from "@/entities/user";
import { ROLE_LABEL, isRole, type RoleName } from "@/shared/config/roles";
import type { FacetOption } from "@/shared/ui/facet-filter";

export interface UserFilters {
  search: string;
  roles: string[];
}

export const EMPTY_USER_FILTERS: UserFilters = {
  search: "",
  roles: [],
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 20;

const PARAM = { search: "q", roles: "role" } as const;
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

export function parseUserFilters(params: URLSearchParams): UserFilters {
  return {
    search: params.get(PARAM.search) ?? "",
    roles: splitList(params.get(PARAM.roles)),
  };
}

export function writeUserFilters(
  filters: UserFilters,
  base: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  const next = new URLSearchParams(base);
  const set = (key: string, value: string) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set(PARAM.search, filters.search.trim());
  set(PARAM.roles, filters.roles.join(","));
  return next;
}

export function countActiveFilters(filters: UserFilters): number {
  return filters.roles.length > 0 ? 1 : 0;
}

export function hasAnyFilter(filters: UserFilters): boolean {
  return countActiveFilters(filters) > 0 || filters.search.trim() !== "";
}

export function matchesSearch(user: User, search: string): boolean {
  const query = search.trim().toLocaleLowerCase("id");
  if (!query) return true;
  const name = (user.profile?.full_name ?? "").toLocaleLowerCase("id");
  const username = user.username.toLocaleLowerCase("id");
  const email = user.email.toLocaleLowerCase("id");
  const dept = (user.profile?.department ?? "").toLocaleLowerCase("id");
  return (
    name.includes(query) ||
    username.includes(query) ||
    email.includes(query) ||
    dept.includes(query)
  );
}

export function applyUserFilters(users: User[], filters: UserFilters): User[] {
  const roles = new Set(filters.roles);
  return users.filter(
    (u) =>
      matchesSearch(u, filters.search) &&
      (roles.size === 0 || roles.has(u.role?.role_name ?? "")),
  );
}

export function getRoleOptions(users: User[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const u of users) {
    const r = u.role?.role_name;
    if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  const order: RoleName[] = [
    "super_admin",
    "tech_lead",
    "project_manager",
    "pentester",
    "technical_writer",
  ];
  const known = order.filter((r) => counts.has(r));
  const unknown = [...counts.keys()].filter((r) => !order.includes(r as RoleName)).sort();
  return [...known, ...unknown].map((value) => ({
    value,
    label: isRole(value) ? ROLE_LABEL[value] : value,
    count: counts.get(value) ?? 0,
  }));
}
