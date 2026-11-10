import { useQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { listProjects, ProjectStatusBadge, type Project } from "@/entities/project";
import { useSession } from "@/entities/session";
import { fmtRange } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { SearchInput } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Alert } from "@/shared/ui/alert";

const columns: ColumnDef<Project>[] = [
  {
    accessorKey: "project_name",
    header: "Proyek",
    cell: ({ row }) => (
      <Link to={`/projects/${row.original.project_id}`} className="text-title-sm text-ink hover:text-brand focus-ring rounded-xs">
        {row.original.project_name}
      </Link>
    ),
  },
  { accessorKey: "client_name", header: "Klien" },
  {
    id: "range",
    header: "Rentang tanggal",
    enableSorting: false,
    cell: ({ row }) => fmtRange(row.original.start_date, row.original.end_date),
  },
  { accessorKey: "total_mandays", header: "Mandays", meta: { numeric: true } },
  { id: "pm", header: "PM", accessorFn: (p) => p.pm?.profile?.full_name ?? p.pm?.username ?? "-" },
  {
    id: "status",
    header: "Status",
    accessorFn: (p) => p.status?.status_name ?? "-",
    cell: ({ row }) => <ProjectStatusBadge name={row.original.status?.status_name} />,
  },
];

export function ProjectsPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const role = useSession((s) => s.user?.role?.role_name);
  const { data, isLoading, error } = useQuery({ queryKey: ["projects", "all"], queryFn: () => listProjects({ limit: 100 }) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proyek"
        description="Daftar proyek sesuai hak akses Anda."
        action={
          role === "tech_lead" || role === "super_admin" ? (
            <Button asChild variant="solid">
              <Link to="/projects/new">Buat Project Template</Link>
            </Button>
          ) : undefined
        }
      />
      {error ? <Alert tone="error" title="Gagal memuat proyek">{error.message}</Alert> : null}
      <SearchInput
        aria-label="Cari proyek"
        placeholder="Cari nama proyek atau klien"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <DataTable
        columns={columns}
        data={(data?.data ?? []).filter((p) => !(role === "project_manager" && p.status?.status_name === "Draft"))}
        noun="proyek"
        caption="Daftar proyek"
        globalFilter={search}
        isLoading={isLoading}
        getRowId={(p) => String(p.project_id)}
        onRowClick={(p) => navigate(`/projects/${p.project_id}`)}
        getRowAriaLabel={(p) => `Buka ${p.project_name}`}
        emptyState={<EmptyState icon={<FolderKanban />} title="Belum ada proyek" description="Tidak ada proyek yang cocok." />}
      />
    </div>
  );
}
