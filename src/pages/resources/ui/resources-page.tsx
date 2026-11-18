import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Bug,
  Building2,
  ClipboardCheck,
  Clock,
  FolderKanban,
  OctagonAlert,
  ShieldCheck,
  User as UserIcon,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { currentMonth, getResourceLoad, monthLabel } from "@/entities/project";
import { listUsers, RoleBadge, type User } from "@/entities/user";
import { isOverLimit, MANDAYS_LIMIT } from "@/shared/config/workload";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { SummaryTile } from "@/shared/ui/summary-tile";
import {
  PAGE_SIZE_OPTIONS,
  applyResourceFilters,
  getResourceRoleOptions,
  hasAnyFilter,
  parsePageSize,
  parseResourceFilters,
  writePageSize,
  writeResourceFilters,
  type ResourceFilters,
  type ResourceRow,
} from "../model/resource-filters";
import { ResourcesFilterBar } from "./resources-filter-bar";

// Hanya yang bekerja di proyek. Super admin dan tech lead adalah pengelola, bukan resource tim.
const TEAM_ROLES = ["pentester", "technical_writer", "project_manager"] as const;
const roleOf = (u: User) => u.role?.role_name ?? "";
const nameOf = (u: User) => u.profile?.full_name ?? u.username;

const columns: ColumnDef<ResourceRow>[] = [
  {
    id: "name",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <UserIcon className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Nama</span>
      </span>
    ),
    accessorFn: (r) => nameOf(r.user),
    cell: ({ row }) => {
      const u = row.original.user;
      const fullName = nameOf(u);
      const initials = fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");

      return (
        <div className="flex items-center gap-2.5">
          <Avatar size="sm" className="size-7 text-[11px] shrink-0">
            <AvatarFallback className="bg-surface-subtle font-medium text-ink-secondary">
              {initials || <UserIcon className="size-3.5 text-ink-muted" aria-hidden="true" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-title-sm font-normal text-ink">{fullName}</span>
        </div>
      );
    },
  },
  {
    id: "role",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <ShieldCheck className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Role</span>
      </span>
    ),
    accessorFn: (r) => roleOf(r.user),
    cell: ({ row }) => <RoleBadge role={roleOf(row.original.user)} />,
  },
  {
    id: "dept",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <Building2 className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Departemen</span>
      </span>
    ),
    accessorFn: (r) => r.user.profile?.department ?? "-",
  },
  {
    id: "projects",
    header: () => (
      <span className="inline-flex items-center gap-1.5 font-normal normal-case">
        <FolderKanban className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Proyek aktif</span>
      </span>
    ),
    accessorFn: (r) => r.load.projects.length,
    cell: ({ row }) => {
      const ps = row.original.load.projects;
      return ps.length === 0 ? (
        <span className="text-ink-muted">-</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ps.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className={cn(
                "inline-flex items-center rounded-xs border-0 px-2 py-0.5 text-xs font-normal",
                "bg-project-chip-bg text-project-chip-fg",
                "transition-opacity duration-150 hover:opacity-80 focus-ring",
              )}
            >
              {p.name}
            </Link>
          ))}
        </div>
      );
    },
  },
  {
    id: "md",
    header: () => (
      <div className="flex items-center justify-end gap-1.5 font-normal normal-case">
        <Clock className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <span>Mandays bulan ini</span>
      </div>
    ),
    accessorFn: (r) => r.load.mandays,
    meta: { numeric: true },
    cell: ({ row }) => {
      const u = row.original.user;
      if (roleOf(u) !== "pentester") {
        return <div className="text-right text-ink-muted">-</div>;
      }
      const md = row.original.load.mandays ?? 0;
      const full = isOverLimit(md);
      return (
        <div className="flex justify-end">
          <span
            data-slot="mandays-chip"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xs border-0 px-2 py-0.5 text-xs font-normal tabular-nums",
              full
                ? "bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"
                : "bg-surface-subtle text-ink-secondary",
            )}
          >
            {full ? <OctagonAlert className="size-3 shrink-0" aria-hidden="true" /> : null}
            <span>{md} MD{full ? " · lewat batas" : ""}</span>
          </span>
        </div>
      );
    },
  },
];

/** Daftar resource (pentester, tech writer, PM) beserta beban mandays dan proyek aktifnya. Untuk Tech Lead dan Superadmin. */
export function ResourcesPage() {
  const thisMonth = useMemo(() => currentMonth(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseResourceFilters(searchParams, thisMonth), [searchParams, thisMonth]);
  const pageSize = parsePageSize(searchParams);

  const setFilters = (next: ResourceFilters) =>
    setSearchParams((prev) => writeResourceFilters(next, thisMonth, prev), { replace: true });
  const setPageSize = (next: number) =>
    setSearchParams((prev) => writePageSize(next, prev), { replace: true });

  const users = useQuery({ queryKey: ["users", "all"], queryFn: () => listUsers() });
  const load = useQuery({
    queryKey: ["workload", "detail", filters.month],
    queryFn: () => getResourceLoad(filters.month),
  });

  const allRows = useMemo<ResourceRow[]>(
    () =>
      (users.data ?? [])
        .filter((u) => (TEAM_ROLES as readonly string[]).includes(roleOf(u)))
        .map((user) => ({ user, load: load.data?.[user.sys_user_id] ?? { mandays: 0, projects: [] } })),
    [users.data, load.data],
  );

  const filteredRows = useMemo(
    () => applyResourceFilters(allRows, filters),
    [allRows, filters],
  );

  const roleOptions = useMemo(() => getResourceRoleOptions(allRows), [allRows]);
  const isFiltered = hasAnyFilter(filters, thisMonth);

  const count = (role: string) => allRows.filter((r) => roleOf(r.user) === role).length;
  const available = allRows.filter((r) => roleOf(r.user) === "pentester" && !isOverLimit(r.load.mandays)).length;
  const loading = users.isLoading || load.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resource"
        description={`Siapa saja yang tersedia untuk ditempatkan di proyek. Mandays dihitung per bulan (${monthLabel(filters.month)}) dan mulai dari 0 tiap ganti bulan; merah bila lebih dari ${MANDAYS_LIMIT} md.`}
      />
      {users.error ? <Alert tone="error" title="Gagal memuat daftar orang">{users.error.message}</Alert> : null}
      {load.error ? <Alert tone="warning" title="Beban mandays belum bisa dihitung">{load.error.message}</Alert> : null}
      <section className="grid gap-4 md:grid-cols-4" aria-label="Ringkasan resource">
        <SummaryTile
          icon={<Bug />}
          label="Pentester"
          value={loading ? null : count("pentester")}
          unit="Orang"
          loading={loading}
          note={{ text: `${available} masih punya kapasitas` }}
        />
        <SummaryTile
          icon={<ClipboardCheck />}
          label="Technical Writer"
          value={loading ? null : count("technical_writer")}
          unit="Orang"
          loading={loading}
          note={{ text: "Penyusun laporan" }}
        />
        <SummaryTile
          icon={<FolderKanban />}
          label="Project Manager"
          value={loading ? null : count("project_manager")}
          unit="Orang"
          loading={loading}
          note={{ text: "Pemilik proyek" }}
        />
        <SummaryTile
          icon={<Users />}
          label="Total"
          value={loading ? null : allRows.length}
          unit="Orang"
          loading={loading}
          note={{ text: "Pentester, writer, dan PM" }}
        />
      </section>

      <div className="flex flex-col gap-4">
        <ResourcesFilterBar
          filters={filters}
          defaultMonth={thisMonth}
          onChange={setFilters}
          roleOptions={roleOptions}
          resultCount={filteredRows.length}
          totalCount={allRows.length}
        />

        <DataTable
          columns={columns}
          data={filteredRows}
          noun="orang"
          caption="Daftar resource"
          isLoading={loading}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
          getRowId={(r) => String(r.user.sys_user_id)}
          initialSorting={[{ id: "md", desc: true }]}
          emptyState={
            isFiltered ? (
              <EmptyState
                icon={<Users />}
                title="Tidak ada resource yang cocok"
                description="Coba ubah kata kunci atau kurangi filter yang aktif."
                action={
                  <Button
                    variant="quiet"
                    onClick={() => setFilters({ search: "", roles: [], month: thisMonth })}
                  >
                    Reset filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Users />}
                title="Belum ada resource"
                description="Data resource tim akan tampil di sini."
              />
            )
          }
        />
      </div>
    </div>
  );
}
