import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, ShieldCheck, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSession } from "@/entities/session";
import { updateUser, type User } from "@/entities/user";
import { changePassword, me } from "@/features/auth";
import { ROLE_LABEL, isRole, type RoleName } from "@/shared/config/roles";
import { Alert } from "@/shared/ui/alert";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Field, FieldGroup, Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { notify } from "@/shared/ui/toast";

const profileFormSchema = z.object({
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
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, strip, atau garis bawah"),
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(255, "Email maksimal 255 karakter"),
  department: z.string().trim().max(100, "Departemen maksimal 100 karakter").optional(),
  phone_number: z.string().trim().max(30, "Nomor telepon maksimal 30 karakter").optional(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z
  .object({
    old_password: z.string().min(1, "Password lama wajib diisi"),
    new_password: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .max(72, "Password baru maksimal 72 karakter"),
    confirm_password: z.string().min(1, "Konfirmasi password baru wajib diisi"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Konfirmasi password baru tidak cocok",
    path: ["confirm_password"],
  });
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export function AccountPage() {
  const queryClient = useQueryClient();
  const sessionUser = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Ambil data profil terbaru dari /auth/me
  const { data: meUser, isLoading: isMeLoading } = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: me,
  });

  const currentUser = meUser ?? sessionUser;
  const isSuperAdmin = currentUser?.role?.role_name === "super_admin";

  const roleName = currentUser?.role?.role_name as RoleName | undefined;
  const roleLabel = roleName && isRole(roleName) ? ROLE_LABEL[roleName] : (currentUser?.role?.role_name ?? "Pengguna");

  const fullName = currentUser?.profile?.full_name ?? currentUser?.username ?? "Pengguna";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  // Form Profil (Hanya Superadmin yang bisa edit)
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isDirty: isProfileDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: currentUser?.profile?.full_name ?? currentUser?.username ?? "",
      username: currentUser?.username ?? "",
      email: currentUser?.email ?? "",
      department: currentUser?.profile?.department ?? "",
      phone_number: currentUser?.profile?.phone_number ?? "",
    },
  });

  useEffect(() => {
    if (currentUser) {
      resetProfile({
        full_name: currentUser.profile?.full_name ?? currentUser.username,
        username: currentUser.username,
        email: currentUser.email,
        department: currentUser.profile?.department ?? "",
        phone_number: currentUser.profile?.phone_number ?? "",
      });
    }
  }, [currentUser, resetProfile]);

  const profileMutation = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      if (!currentUser?.sys_user_id) {
        throw new Error("User ID tidak ditemukan");
      }
      return updateUser(currentUser.sys_user_id, {
        full_name: values.full_name,
        username: values.username,
        email: values.email,
        department: values.department || undefined,
        phone_number: values.phone_number || undefined,
      });
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      notify.success("Informasi akun berhasil diperbarui");
    },
  });

  // Form Ganti Password (Semua Role)
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      }),
    onSuccess: () => {
      notify.success("Password berhasil diperbarui", {
        description: "Gunakan password baru Anda untuk sesi login berikutnya.",
      });
      resetPassword();
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    },
  });

  if (isMeLoading && !currentUser) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Akun Saya" description="Memuat informasi akun..." />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Akun Saya"
        description="Kelola informasi profil akun Anda dan perbarui password keamanan secara mandiri."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Informasi Profil */}
        <Card className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16 shrink-0 text-title-lg">
                <AvatarFallback>{initials || "US"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <h2 className="truncate text-title-md text-ink">{fullName}</h2>
                <p className="truncate text-body-sm text-ink-muted">@{currentUser?.username}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 text-caption font-medium text-ink">
                    {roleLabel}
                  </span>
                  {currentUser?.profile?.department ? (
                    <span className="truncate text-caption text-ink-secondary">
                      · {currentUser.profile.department}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="size-4 text-ink-muted" aria-hidden />
              <h3 className="text-title-sm text-ink">Informasi Pengguna</h3>
            </div>

            {isSuperAdmin ? (
              <form
                noValidate
                onSubmit={handleSubmitProfile((v) => profileMutation.mutate(v))}
                className="flex flex-col gap-4"
              >
                {profileMutation.error ? (
                  <Alert tone="error" title="Gagal memperbarui profil" compact>
                    {profileMutation.error.message}
                  </Alert>
                ) : null}

                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama Lengkap" error={profileErrors.full_name?.message}>
                      {(f) => <Input {...f} {...registerProfile("full_name")} />}
                    </Field>
                    <Field label="Username" error={profileErrors.username?.message}>
                      {(f) => <Input {...f} {...registerProfile("username")} />}
                    </Field>
                  </div>

                  <Field label="Email" error={profileErrors.email?.message}>
                    {(f) => <Input type="email" {...f} {...registerProfile("email")} />}
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Departemen / Divisi" error={profileErrors.department?.message}>
                      {(f) => (
                        <Input
                          placeholder="Offensive Security"
                          {...f}
                          {...registerProfile("department")}
                        />
                      )}
                    </Field>
                    <Field label="Nomor Telepon" error={profileErrors.phone_number?.message}>
                      {(f) => (
                        <Input
                          placeholder="081234567890"
                          {...f}
                          {...registerProfile("phone_number")}
                        />
                      )}
                    </Field>
                  </div>
                </FieldGroup>

                <div className="flex items-center justify-end pt-2">
                  <Button
                    type="submit"
                    variant="solid"
                    disabled={!isProfileDirty}
                    loading={profileMutation.isPending}
                  >
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <FieldGroup>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama Lengkap">
                      {(f) => <Input readOnly disabled value={fullName} {...f} />}
                    </Field>
                    <Field label="Username">
                      {(f) => <Input readOnly disabled value={currentUser?.username ?? "-"} {...f} />}
                    </Field>
                  </div>

                  <Field label="Email">
                    {(f) => <Input readOnly disabled value={currentUser?.email ?? "-"} {...f} />}
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Departemen / Divisi">
                      {(f) => (
                        <Input
                          readOnly
                          disabled
                          value={currentUser?.profile?.department || "Belum diisi"}
                          {...f}
                        />
                      )}
                    </Field>
                    <Field label="Nomor Telepon">
                      {(f) => (
                        <Input
                          readOnly
                          disabled
                          value={currentUser?.profile?.phone_number || "Belum diisi"}
                          {...f}
                        />
                      )}
                    </Field>
                  </div>
                </FieldGroup>

                <div className="rounded-sm border border-border bg-surface-subtle p-3 text-caption text-ink-secondary">
                  Perubahan data profil (nama, email, departemen, telepon) dikelola secara terpusat oleh
                  Superadmin. Silakan hubungi Superadmin jika terdapat pembaruan data Anda.
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Kolom Kanan: Perbarui Password Mandiri */}
        <Card className="flex flex-col gap-6 lg:col-span-5">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-surface-subtle text-ink">
                <Lock className="size-4" aria-hidden />
              </div>
              <div>
                <h3 className="text-title-sm text-ink">Perbarui Password</h3>
                <p className="text-caption text-ink-muted">Verifikasi password lama untuk membuat password baru.</p>
              </div>
            </div>
          </div>

          <form
            noValidate
            onSubmit={handleSubmitPassword((v) => passwordMutation.mutate(v))}
            className="flex flex-col gap-4"
          >
            {passwordMutation.error ? (
              <Alert tone="error" title="Gagal memperbarui password" compact>
                {passwordMutation.error.message}
              </Alert>
            ) : null}

            <FieldGroup>
              <Field label="Password Lama" error={passwordErrors.old_password?.message}>
                {(f) => (
                  <div className="relative">
                    <Input
                      type={showOldPassword ? "text" : "password"}
                      placeholder="Masukkan password saat ini"
                      className="pr-10"
                      {...f}
                      {...registerPassword("old_password")}
                    />
                    <button
                      type="button"
                      aria-label={showOldPassword ? "Sembunyikan password" : "Tampilkan password"}
                      onClick={() => setShowOldPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-ink-muted hover:text-ink focus-ring"
                    >
                      {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                )}
              </Field>

              <Field
                label="Password Baru"
                labelMeta={<span className="text-caption text-ink-muted">Min. 8 karakter</span>}
                error={passwordErrors.new_password?.message}
              >
                {(f) => (
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Masukkan password baru"
                      className="pr-10"
                      {...f}
                      {...registerPassword("new_password")}
                    />
                    <button
                      type="button"
                      aria-label={showNewPassword ? "Sembunyikan password" : "Tampilkan password"}
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-ink-muted hover:text-ink focus-ring"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Konfirmasi Password Baru" error={passwordErrors.confirm_password?.message}>
                {(f) => (
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Ulangi password baru"
                      className="pr-10"
                      {...f}
                      {...registerPassword("confirm_password")}
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-1 text-ink-muted hover:text-ink focus-ring"
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                )}
              </Field>
            </FieldGroup>

            <div className="flex items-center gap-2 rounded-sm bg-surface-subtle p-3 text-caption text-ink-muted">
              <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
              <span>Password minimal 8 karakter dan maksimal 72 karakter.</span>
            </div>

            <Button
              type="submit"
              variant="solid"
              loading={passwordMutation.isPending}
              className="mt-2"
            >
              Perbarui Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
