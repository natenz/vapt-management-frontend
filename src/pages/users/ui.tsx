import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { listRoles, listUsers, type User } from "@/entities/user";
import { ROLE_LABEL, isRole } from "@/shared/config/roles";
import { Alert } from "@/shared/ui/alert";
import { DataTable } from "@/shared/ui/data-table";
import { SearchInput } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";

const columns: ColumnDef<User>[] = [
  { id: "name", header: "Nama", accessorFn: (u) => u.profile?.full_name ?? u.username, cell: ({ row }) => <span className="text-title-sm text-ink">{row.original.profile?.full_name ?? row.original.username}</span> },
  { accessorKey: "username", header: "Username" },
  { accessorKey: "email", header: "Email" },
  { id: "role", header: "Role", accessorFn: (u) => u.role?.role_name ?? "-", cell: ({ row }) => { const n = row.original.role?.role_name; return isRole(n) ? ROLE_LABEL[n] : (n ?? "-"); } },
  { id: "dept", header: "Departemen", accessorFn: (u) => u.profile?.department ?? "-" },
];

export function UsersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["users"], queryFn: () => listUsers() });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Kelola User" description="Akun dan role (sys_users, ms_roles). Tambah, ubah, dan hapus akun belum dipasang di UI ini." />
      {error ? <Alert tone="error" title="Gagal memuat user">{error.message}</Alert> : null}
      <SearchInput aria-label="Cari user" placeholder="Cari nama, username, atau email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <DataTable columns={columns} data={data ?? []} noun="user" caption="Daftar user" globalFilter={search} isLoading={isLoading} getRowId={(u) => String(u.sys_user_id)} />
    </div>
  );
}

export function RolesPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Hak Akses Role" description="Isi ms_roles.permissions dari BE. Aturan akses yang sebenarnya ditegakkan di service BE." />
      {error ? <Alert tone="error" title="Gagal memuat role">{error.message}</Alert> : null}
      {isLoading ? <Skeleton className="h-40" /> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {(data ?? []).map((r) => (
            <li key={r.role_id} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4">
              <span className="text-title-sm text-ink">{isRole(r.role_name) ? ROLE_LABEL[r.role_name] : r.role_name}</span>
              <span className="text-body-sm text-ink-muted">{r.description || "Tanpa deskripsi"}</span>
              <span className="text-caption text-ink-muted">{r.permissions || "permissions kosong"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
