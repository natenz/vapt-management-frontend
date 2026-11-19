import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Building2, CalendarRange, Clock, Plus, ShieldAlert, Users } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  listAllProjects,
  listStatuses,
  ProjectStatusBadge,
  type Project,
} from "@/entities/project";
import { useSession } from "@/entities/session";
import { ProjectMetricsSection, type ScheduleView } from "@/widgets/project-metrics-section";
import { ProjectTimeline } from "@/widgets/project-timeline";
import { fmtRange } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Alert } from "@/shared/ui/alert";
import {
  EMPTY_PROJECT_FILTERS,
  PAGE_SIZE_OPTIONS,
  applyProjectFilters,
  getClientOptions,
  getStatusOptions,
  hasAnyFilter,
  parsePageSize,
  parseProjectFilters,
  writePageSize,
  writeProjectFilters,
  type ProjectFilters,
} from "../model/project-filters";
import { ProjectResourcesCell } from "./project-resources-cell";
import { ProjectsFilterBar } from "./projects-filter-bar";

export function ProjectsPage() {
  // Filter & ukuran halaman disimpan di URL agar bisa dibagikan dan bertahan saat kembali
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseProjectFilters(searchParams), [searchParams]);
  const pageSize = parsePageSize(searchParams);

  const setFilters = (next: ProjectFilters) =>
    setSearchParams((prev) => writeProjectFilters(next, prev), { replace: true });
  const setPageSize = (next: number) =>
    setSearchParams((prev) => writePageSize(next, prev), { replace: true });

  // Tampilan halaman: Overview (grafik + tabel) atau Timeline (konten lain disembunyikan)
  const view: ScheduleView = searchParams.get("tampilan") === "timeline" ? "timeline" : "overview";
  const setView = (next: ScheduleView) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "timeline") params.set("tampilan", "timeline");
        else params.delete("tampilan");
        return params;
      },
      { replace: true },
    );

  const navigate = useNavigate();
  const role = useSession((s) => s.user?.role?.role_name);
  const currentUserId = useSession((s) => s.user?.sys_user_id);
  const includePm = role !== "project_manager";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["projects", "all"],
    queryFn: listAllProjects,
  });
  const { data: statuses } = useQuery({
    queryKey: ["statuses"],
    queryFn: listStatuses,
  });

  const allProjects = useMemo(() => data?.data ?? [], [data]);
  const filteredProjects = useMemo(
    () => applyProjectFilters(allProjects, filters),
    [allProjects, filters],
  );
  const statusOptions = useMemo(() => getStatusOptions(allProjects), [allProjects]);
  const clientOptions = useMemo(() => getClientOptions(allProjects), [allProjects]);
  const isFiltered = hasAnyFilter(filters);

  const columns = useMemo<ColumnDef<Project>[]>(() => {
    return [
      {
        accessorKey: "project_name",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <FolderKanban className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Proyek</span>
          </span>
        ),
        cell: ({ row }) => (
          <Link
            to={`/projects/${row.original.project_id}`}
            className="rounded-xs text-title-sm font-normal text-ink focus-ring hover:text-brand"
          >
            {row.original.project_name}
          </Link>
        ),
      },
      {
        accessorKey: "client_name",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Building2 className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Klien</span>
          </span>
        ),
      },
      {
        id: "range",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <CalendarRange className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Rentang tanggal</span>
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => fmtRange(row.original.start_date, row.original.end_date),
      },
      {
        accessorKey: "total_mandays",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Clock className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Mandays</span>
          </span>
        ),
        meta: { numeric: true },
      },
      {
        id: "resources",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Users className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Resources</span>
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <ProjectResourcesCell
            project={row.original}
            currentUserId={currentUserId}
            includePm={includePm}
          />
        ),
      },
      {
        id: "status",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <ShieldAlert className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Status</span>
          </span>
        ),
        accessorFn: (p) => p.status?.status_name ?? "-",
        cell: ({ row }) => <ProjectStatusBadge name={row.original.status?.status_name} />,
      },
    ];
  }, [includePm, currentUserId]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proyek"
        description="Daftar Proyek"
        action={
          role === "tech_lead" || role === "super_admin" ? (
            <Button asChild variant="solid" leadingIcon={<Plus />}>
              <Link to="/projects/new">Buat Template Proyek</Link>
            </Button>
          ) : undefined
        }
      />
      {error && view === "overview" ? (
        <Alert tone="error" title="Gagal memuat proyek">
          {error.message}
        </Alert>
      ) : null}

      {/* Dark Line Chart Card with VAPT Red Gradient (Project Schedule Overview) */}
      <ProjectMetricsSection
        projects={allProjects}
        statuses={statuses}
        isLoading={isLoading}
        view={view}
        onViewChange={setView}
        renderTimeline={({ schedule, onScheduleChange }) => (
          // Memakai data kueri yang sama dengan Overview: tanpa request tambahan
          <ProjectTimeline
            projects={allProjects}
            schedule={schedule}
            onScheduleChange={onScheduleChange}
            isLoading={isLoading}
            error={error}
            onRetry={() => void refetch()}
          />
        )}
      />

      {view === "overview" ? (
        <div className="flex flex-col gap-4">
          <ProjectsFilterBar
            filters={filters}
            onChange={setFilters}
            statusOptions={statusOptions}
            clientOptions={clientOptions}
            resultCount={filteredProjects.length}
            totalCount={allProjects.length}
          />
          <DataTable
            columns={columns}
            data={filteredProjects}
            noun="proyek"
            caption="Daftar Proyek"
            isLoading={isLoading}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            getRowId={(p) => String(p.project_id)}
            onRowClick={(p) => navigate(`/projects/${p.project_id}`)}
            getRowAriaLabel={(p) => `Buka ${p.project_name}`}
            emptyState={
              isFiltered ? (
                <EmptyState
                  icon={<FolderKanban />}
                  title="Tidak ada proyek yang cocok"
                  description="Coba ubah kata kunci atau kurangi filter yang aktif."
                  action={
                    <Button variant="quiet" onClick={() => setFilters(EMPTY_PROJECT_FILTERS)}>
                      Reset filter
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<FolderKanban />}
                  title="Belum ada proyek"
                  description="Proyek yang dapat Anda akses akan tampil di sini."
                />
              )
            }
          />
        </div>
      ) : null}
    </div>
  );
}
