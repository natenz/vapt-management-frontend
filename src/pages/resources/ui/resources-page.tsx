import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Bug, Circle, ClipboardCheck, FolderKanban, OctagonAlert, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { getResourceLoad, type ResourceLoad } from "@/entities/project";
import { listUsers, type User } from "@/entities/user";
import { ROLE_LABEL, isRole } from "@/shared/config/roles";
import { MANDAYS_LIMIT } from "@/shared/config/workload";
import { Alert } from "@/shared/ui/alert";
import { StatusBadge } from "@/shared/ui/badge";
import { DataTable } from "@/shared/ui/data-table";
import { SearchInput } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { SummaryTile } from "@/shared/ui/summary-tile";

// Hanya yang bekerja di proyek. Super admin dan tech lead adalah pengelola, bukan resource tim.
const TEAM_ROLES = ["pentester", "technical_writer", "project_manager"] as const;
const roleOf = (u: User) => u.role?.role_name ?? "";
const nameOf = (u: User) => u.profile?.full_name ?? u.username;

type Row = { user: User; load: ResourceLoad };

const columns: ColumnDef<Row>[] = [
  {
    id: "name",
    header: "Nama",
    accessorFn: (r) => nameOf(r.user),
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="text-title-sm text-ink">{nameOf(row.original.user)}</span>
        <span className="text-caption text-ink-muted">{row.original.user.username}</span>
      </span>
    ),
  },
  {
    id: "role",
    header: "Role",
    accessorFn: (r) => roleOf(r.user),
    cell: ({ row }) => {
      const n = roleOf(row.original.user);
      return isRole(n) ? ROLE_LABEL[n] : n || "-";
    },
  },
  { id: "dept", header: "Departemen", accessorFn: (r) => r.user.profile?.department ?? "-" },
  {
    id: "projects",
    header: "Proyek aktif",
    accessorFn: (r) => r.load.projects.length,
    cell: ({ row }) => {
      const ps = row.original.load.projects;
      return ps.length === 0 ? (
        <span className="text-ink-muted">-</span>
      ) : (
        <span className="flex flex-wrap gap-x-2 gap-y-1">
          {ps.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="rounded-xs text-brand hover:underline focus-ring">
              {p.name}
            </Link>
          ))}
        </span>
      );
    },
  },
  {
    id: "md",
    header: "Mandays aktif",
    accessorFn: (r) => r.load.mandays,
    meta: { numeric: true },
    cell: ({ row }) => {
      const u = row.original.user;
      if (roleOf(u) !== "pentester") return <span className="text-ink-muted">-</span>;
      const md = row.original.load.mandays;
      const full = md >= MANDAYS_LIMIT;
      return (
        <StatusBadge
          tone={full ? "error" : "neutral"}
          icon={full ? <OctagonAlert aria-hidden /> : <Circle className="fill-current" aria-hidden />}
        >
          {md} md{full ? " · penuh" : ""}
        </StatusBadge>
      );
    },
  },
];

/** Daftar resource (pentester, tech writer, PM) beserta beban mandays dan proyek aktifnya. Untuk Tech Lead dan Superadmin. */
export function ResourcesPage() {
  const [search, setSearch] = useState("");
  const users = useQuery({ queryKey: ["users", "all"], queryFn: () => listUsers() });
  const load = useQuery({ queryKey: ["workload", "detail"], queryFn: getResourceLoad });

  const rows = useMemo<Row[]>(
    () =>
      (users.data ?? [])
        .filter((u) => (TEAM_ROLES as readonly string[]).includes(roleOf(u)))
        .map((user) => ({ user, load: load.data?.[user.sys_user_id] ?? { mandays: 0, projects: [] } })),
    [users.data, load.data],
  );
  const count = (role: string) => rows.filter((r) => roleOf(r.user) === role).length;
  const available = rows.filter((r) => roleOf(r.user) === "pentester" && r.load.mandays < MANDAYS_LIMIT).length;
  const loading = users.isLoading || load.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resource"
        description={`Siapa saja yang tersedia untuk ditempatkan di proyek. Mandays dihitung dari proyek yang belum Done; penuh bila ${MANDAYS_LIMIT} md atau lebih.`}
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
          value={loading ? null : rows.length}
          unit="Orang"
          loading={loading}
          note={{ text: "Pentester, writer, dan PM" }}
        />
      </section>
      <SearchInput
        aria-label="Cari resource"
        placeholder="Cari nama, username, role, atau departemen"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <DataTable
        columns={columns}
        data={rows}
        noun="orang"
        caption="Daftar resource"
        globalFilter={search}
        isLoading={loading}
        getRowId={(r) => String(r.user.sys_user_id)}
        initialSorting={[{ id: "md", desc: true }]}
      />
    </div>
  );
}
