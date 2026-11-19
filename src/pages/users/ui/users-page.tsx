import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Eye,
  EyeOff,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { useSession } from "@/entities/session";
import {
  createUser,
  deleteUser,
  listRoles,
  listUsers,
  RoleBadge,
  updateUser,
  type RoleDetail,
  type User,
} from "@/entities/user";
import { ROLE_LABEL, isRole } from "@/shared/config/roles";
import { Alert } from "@/shared/ui/alert";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { DataTable } from "@/shared/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Field, FieldGroup, Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { notify } from "@/shared/ui/toast";
import {
  EMPTY_USER_FILTERS,
  PAGE_SIZE_OPTIONS,
  applyUserFilters,
  getRoleOptions,
  hasAnyFilter,
  parsePageSize,
  parseUserFilters,
  writePageSize,
  writeUserFilters,
  type UserFilters,
} from "../model/user-filters";
import { UsersFilterBar } from "./users-filter-bar";

const DEFAULT_ROLES: RoleDetail[] = [
  { role_id: 1, role_name: "super_admin", description: "Bisa mengatur semua hal di sistem, termasuk pengguna" },
  { role_id: 2, role_name: "tech_lead", description: "Membuat template proyek, menentukan batas mandays, dan meng-ACC catalog" },
  { role_id: 3, role_name: "project_manager", description: "Mengisi asset dan jadwal, lalu memantau proyek sampai klien selesai memperbaiki" },
  { role_id: 4, role_name: "pentester", description: "Mencatat finding celah keamanan dan mengujinya ulang setelah diperbaiki" },
  { role_id: 5, role_name: "technical_writer", description: "Merapikan tulisan finding dan menyusun report" },
];

const createUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .max(255, "Nama lengkap maksimal 255 karakter"),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(100, "Username maksimal 100 karakter")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berupa huruf, angka, titik, strip, atau garis bawah"),
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter"),
  role_id: z.number().min(1, "Pilih role pengguna"),
  phone_number: z.string().trim().max(30, "Nomor telepon maksimal 30 karakter").optional(),
  department: z.string().trim().max(100, "Departemen maksimal 100 karakter").optional(),
});
type CreateUserFormValues = z.infer<typeof createUserSchema>;

const updateUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .max(255, "Nama lengkap maksimal 255 karakter"),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(100, "Username maksimal 100 karakter")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh berupa huruf, angka, titik, strip, atau garis bawah"),
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter"),
  password: z
    .string()
    .max(72, "Password maksimal 72 karakter")
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password baru minimal 8 karakter jika diisi",
    }),
  role_id: z.number().min(1, "Pilih role pengguna"),
  phone_number: z.string().trim().max(30, "Nomor telepon maksimal 30 karakter").optional(),
  department: z.string().trim().max(100, "Departemen maksimal 100 karakter").optional(),
});
type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseUserFilters(searchParams), [searchParams]);
  const pageSize = parsePageSize(searchParams);

  const setFilters = (next: UserFilters) =>
    setSearchParams((prev) => writeUserFilters(next, prev), { replace: true });
  const setPageSize = (next: number) =>
    setSearchParams((prev) => writePageSize(next, prev), { replace: true });

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const queryClient = useQueryClient();
  const currentSysUserId = useSession((s) => s.user?.sys_user_id);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsers(),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: listRoles,
  });

  const rolesList: RoleDetail[] = useMemo(() => {
    if (rolesQuery.data && rolesQuery.data.length > 0) {
      return rolesQuery.data;
    }
    return DEFAULT_ROLES;
  }, [rolesQuery.data]);

  // Form Tambah Pengguna
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      full_name: "",
      username: "",
      email: "",
      password: "",
      role_id: 4, // Default ke Pentester
      phone_number: "",
      department: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateUserFormValues) =>
      createUser({
        full_name: values.full_name,
        username: values.username,
        email: values.email,
        password: values.password,
        role_id: values.role_id,
        phone_number: values.phone_number || undefined,
        department: values.department || undefined,
      }),
    onSuccess: (newUser) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify.success("Pengguna baru berhasil ditambahkan", {
        description: `Akun @${newUser.username} sudah dibuat dan bisa dipakai untuk login.`,
      });
      resetCreate();
      setCreateOpen(false);
      setShowCreatePassword(false);
    },
  });

  // Form Ubah Pengguna
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    if (editUser) {
      resetEdit({
        full_name: editUser.profile?.full_name ?? editUser.username,
        username: editUser.username,
        email: editUser.email,
        password: "",
        role_id: editUser.role?.role_id ?? editUser.role_id ?? 1,
        phone_number: editUser.profile?.phone_number ?? "",
        department: editUser.profile?.department ?? "",
      });
      setShowEditPassword(false);
    }
  }, [editUser, resetEdit]);

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: UpdateUserFormValues }) =>
      updateUser(id, {
        full_name: values.full_name,
        username: values.username,
        email: values.email,
        role_id: values.role_id,
        phone_number: values.phone_number || undefined,
        department: values.department || undefined,
        password: values.password ? values.password : undefined,
      }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify.success("Data pengguna berhasil diperbarui", {
        description: `Perubahan akun @${updated.username} sudah disimpan.`,
      });
      setEditUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify.success("Pengguna berhasil dihapus", {
        description: "Akun dan profilnya sudah dihapus.",
      });
      setDeleteUserTarget(null);
    },
  });

  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const filteredUsers = useMemo(
    () => applyUserFilters(allUsers, filters),
    [allUsers, filters],
  );
  const roleOptions = useMemo(() => getRoleOptions(allUsers), [allUsers]);
  const isFiltered = hasAnyFilter(filters);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <UserIcon className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Pengguna</span>
          </span>
        ),
        accessorFn: (u) => u.profile?.full_name ?? u.username,
        cell: ({ row }) => {
          const u = row.original;
          const fullName = u.profile?.full_name ?? u.username;
          const initials = fullName
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("");

          return (
            <div className="flex items-center gap-3">
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback>{initials || "US"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-title-sm font-normal text-ink">{fullName}</span>
                <span className="truncate text-caption text-ink-muted">@{u.username}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Mail className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Email</span>
          </span>
        ),
        cell: ({ row }) => <span className="text-body-sm text-ink-secondary">{row.original.email}</span>,
      },
      {
        id: "role",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <ShieldCheck className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Role</span>
          </span>
        ),
        accessorFn: (u) => u.role?.role_name ?? "-",
        cell: ({ row }) => <RoleBadge role={row.original.role?.role_name} />,
      },
      {
        id: "dept",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Building2 className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Departemen</span>
          </span>
        ),
        accessorFn: (u) => u.profile?.department ?? "-",
        cell: ({ row }) => (
          <span className="text-body-sm text-ink-secondary">{row.original.profile?.department || "-"}</span>
        ),
      },
      {
        id: "phone",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <Phone className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Telepon</span>
          </span>
        ),
        accessorFn: (u) => u.profile?.phone_number ?? "-",
        cell: ({ row }) => (
          <span className="text-body-sm text-ink-secondary">{row.original.profile?.phone_number || "-"}</span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="inline-flex items-center gap-1.5 font-normal normal-case">
            <SlidersHorizontal className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            <span>Aksi</span>
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const u = row.original;
          const isSelf = u.sys_user_id === currentSysUserId;

          return (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="quiet"
                className="h-8 px-2 text-ink-secondary hover:text-ink"
                title="Ubah data pengguna"
                aria-label={`Ubah ${u.username}`}
                onClick={() => setEditUser(u)}
              >
                <Pencil className="size-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:text-caption">Ubah</span>
              </Button>
              <Button
                type="button"
                variant="quiet"
                className="h-8 px-2 text-error hover:bg-error-bg"
                title={isSelf ? "Tidak dapat menghapus akun sendiri" : "Hapus pengguna"}
                aria-label={`Hapus ${u.username}`}
                disabled={isSelf || deleteMutation.isPending}
                onClick={() => setDeleteUserTarget(u)}
              >
                <Trash2 className="size-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:text-caption">Hapus</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [currentSysUserId, deleteMutation.isPending],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kelola User"
        description="Atur akun dan role pengguna VAPT Command Center."
        action={
          <Button variant="solid" leadingIcon={<Plus />} onClick={() => setCreateOpen(true)}>
            Tambah User
          </Button>
        }
      />

      {usersQuery.error ? (
        <Alert tone="error" title="Gagal memuat daftar pengguna">
          {usersQuery.error.message}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        <UsersFilterBar
          filters={filters}
          onChange={setFilters}
          roleOptions={roleOptions}
          resultCount={filteredUsers.length}
          totalCount={allUsers.length}
        />

        <DataTable
          columns={columns}
          data={filteredUsers}
          noun="user"
          caption="Daftar akun pengguna sistem VAPT"
          isLoading={usersQuery.isLoading}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
          getRowId={(u) => String(u.sys_user_id)}
          onRowClick={(u) => setEditUser(u)}
          getRowAriaLabel={(u) => `Ubah data ${u.username}`}
          emptyState={
            isFiltered ? (
              <EmptyState
                icon={<Users />}
                title="Tidak ada pengguna yang cocok"
                description="Coba ubah kata kunci atau kurangi filter yang aktif."
                action={
                  <Button variant="quiet" onClick={() => setFilters(EMPTY_USER_FILTERS)}>
                    Reset filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<Users />}
                title="Belum ada pengguna"
                description="Pengguna yang sudah dibuat akan muncul di sini."
              />
            )
          }
        />
      </div>

      {/* Modal Tambah User */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                <UserPlus className="size-4" aria-hidden />
              </div>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </div>
            <DialogDescription>
              Kredensial login dan profil pengguna akan dibuat secara bersamaan di sistem.
            </DialogDescription>
          </DialogHeader>

          <form
            noValidate
            onSubmit={handleSubmitCreate((v) => createMutation.mutate(v))}
            className="mt-4 flex flex-col gap-4"
          >
            {createMutation.error ? (
              <Alert tone="error" title="Gagal menambahkan pengguna" compact>
                {createMutation.error.message}
              </Alert>
            ) : null}

            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama Lengkap" error={createErrors.full_name?.message}>
                  {(f) => (
                    <Input
                      placeholder="Pentester Baru"
                      autoFocus
                      {...f}
                      {...registerCreate("full_name")}
                    />
                  )}
                </Field>
                <Field label="Username" error={createErrors.username?.message}>
                  {(f) => (
                    <Input
                      placeholder="pentester.baru"
                      {...f}
                      {...registerCreate("username")}
                    />
                  )}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" error={createErrors.email?.message}>
                  {(f) => (
                    <Input
                      type="email"
                      placeholder="pentester.baru@vapt.local"
                      {...f}
                      {...registerCreate("email")}
                    />
                  )}
                </Field>

                <Field label="Password" error={createErrors.password?.message}>
                  {(f) => (
                    <div className="relative">
                      <Input
                        type={showCreatePassword ? "text" : "password"}
                        placeholder="Minimal 8 karakter"
                        className="pr-10"
                        {...f}
                        {...registerCreate("password")}
                      />
                      <button
                        type="button"
                        aria-label={showCreatePassword ? "Sembunyikan password" : "Tampilkan password"}
                        onClick={() => setShowCreatePassword((v) => !v)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-ink-muted hover:text-ink focus-ring"
                      >
                        {showCreatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  )}
                </Field>
              </div>

              <Field label="Role Pengguna" error={createErrors.role_id?.message}>
                {(f) => (
                  <select
                    className="h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring"
                    {...f}
                    {...registerCreate("role_id", { valueAsNumber: true })}
                  >
                    {rolesList.map((r) => (
                      <option key={r.role_id} value={r.role_id}>
                        {isRole(r.role_name) ? ROLE_LABEL[r.role_name] : r.role_name}
                        {r.description ? ` — ${r.description}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Departemen / Divisi (Opsional)" error={createErrors.department?.message}>
                  {(f) => (
                    <Input
                      placeholder="Offensive Security"
                      {...f}
                      {...registerCreate("department")}
                    />
                  )}
                </Field>
                <Field label="Nomor Telepon (Opsional)" error={createErrors.phone_number?.message}>
                  {(f) => (
                    <Input
                      placeholder="081234567890"
                      {...f}
                      {...registerCreate("phone_number")}
                    />
                  )}
                </Field>
              </div>
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="quiet" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="solid" loading={createMutation.isPending}>
                Simpan User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ubah User */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Ubah Data Pengguna</DialogTitle>
            <DialogDescription>
              Perbarui profil atau role pengguna @{editUser?.username}.
            </DialogDescription>
          </DialogHeader>

          {editUser ? (
            <form
              noValidate
              onSubmit={handleSubmitEdit((values) =>
                updateMutation.mutate({ id: editUser.sys_user_id, values }),
              )}
              className="mt-4 flex flex-col gap-4"
            >
              {updateMutation.error ? (
                <Alert tone="error" title="Gagal memperbarui pengguna" compact>
                  {updateMutation.error.message}
                </Alert>
              ) : null}

              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nama Lengkap" error={editErrors.full_name?.message}>
                    {(f) => <Input {...f} {...registerEdit("full_name")} />}
                  </Field>
                  <Field label="Username" error={editErrors.username?.message}>
                    {(f) => <Input {...f} {...registerEdit("username")} />}
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" error={editErrors.email?.message}>
                    {(f) => <Input type="email" {...f} {...registerEdit("email")} />}
                  </Field>

                  <Field
                    label="Password Baru"
                    labelMeta={<span className="text-caption text-ink-muted">(Opsional)</span>}
                    error={editErrors.password?.message}
                  >
                    {(f) => (
                      <div className="relative">
                        <Input
                          type={showEditPassword ? "text" : "password"}
                          placeholder="Kosongkan jika tidak diubah"
                          className="pr-10"
                          {...f}
                          {...registerEdit("password")}
                        />
                        <button
                          type="button"
                          aria-label={showEditPassword ? "Sembunyikan password" : "Tampilkan password"}
                          onClick={() => setShowEditPassword((v) => !v)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-ink-muted hover:text-ink focus-ring"
                        >
                          {showEditPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    )}
                  </Field>
                </div>

                <Field label="Role Pengguna" error={editErrors.role_id?.message}>
                  {(f) => (
                    <select
                      className="h-10 w-full rounded-sm border border-border-control bg-surface px-3 text-input text-ink focus-ring"
                      {...f}
                      {...registerEdit("role_id", { valueAsNumber: true })}
                    >
                      {rolesList.map((r) => (
                        <option key={r.role_id} value={r.role_id}>
                          {isRole(r.role_name) ? ROLE_LABEL[r.role_name] : r.role_name}
                          {r.description ? ` — ${r.description}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Departemen / Divisi" error={editErrors.department?.message}>
                    {(f) => <Input placeholder="Departemen" {...f} {...registerEdit("department")} />}
                  </Field>
                  <Field label="Nomor Telepon" error={editErrors.phone_number?.message}>
                    {(f) => <Input placeholder="Nomor Telepon" {...f} {...registerEdit("phone_number")} />}
                  </Field>
                </div>
              </FieldGroup>

              <DialogFooter>
                <Button type="button" variant="quiet" onClick={() => setEditUser(null)}>
                  Batal
                </Button>
                <Button type="submit" variant="solid" loading={updateMutation.isPending}>
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus User */}
      <Dialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Hapus Pengguna</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-ink">
                {deleteUserTarget?.profile?.full_name ?? deleteUserTarget?.username}
              </strong>{" "}
              (@{deleteUserTarget?.username})?
            </DialogDescription>
          </DialogHeader>

          {deleteMutation.error ? (
            <Alert tone="error" title="Gagal menghapus pengguna" compact>
              {deleteMutation.error.message}
            </Alert>
          ) : null}

          <p className="mt-2 text-body-sm text-ink-secondary">
            Tindakan ini tidak dapat dibatalkan. Pengguna yang memiliki riwayat keterlibatan pada proyek atau findings
            tidak dapat dihapus untuk menjaga audit trail.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="quiet"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteUserTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="solid"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteUserTarget) {
                  deleteMutation.mutate(deleteUserTarget.sys_user_id);
                }
              }}
            >
              Ya, Hapus Pengguna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RolesPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Hak Akses Role"
        description="Daftar role dan apa saja yang boleh dilakukan masing-masing. Aturan aksesnya dijaga di server."
      />
      {error ? <Alert tone="error" title="Gagal memuat role">{error.message}</Alert> : null}
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
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
