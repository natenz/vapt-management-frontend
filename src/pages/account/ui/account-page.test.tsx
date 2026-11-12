import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/entities/session";
import type { User } from "@/entities/user";
import { AccountPage } from "./account-page";

const mockSuperadmin: User = {
  sys_user_id: 1,
  username: "superadmin",
  email: "superadmin@vapt.local",
  role_id: 1,
  role: { role_id: 1, role_name: "super_admin" },
  profile: { user_id: 1, full_name: "Super Admin", department: "IT Security", phone_number: "0811111111" },
};

const mockPentester: User = {
  sys_user_id: 4,
  username: "pentester.budi",
  email: "budi@vapt.local",
  role_id: 4,
  role: { role_id: 4, role_name: "pentester" },
  profile: { user_id: 4, full_name: "Budi Santoso", department: "Offensive Security", phone_number: "081234567890" },
};

const mockUpdateUser = vi.fn();
const mockChangePassword = vi.fn();

vi.mock("@/entities/user", () => ({
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
}));

vi.mock("@/features/auth", () => ({
  me: async () => mockSuperadmin,
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

describe("AccountPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useSession.getState().setSession({
      access_token: "token",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      user: mockSuperadmin,
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AccountPage />
      </QueryClientProvider>,
    );

  it("merender informasi akun dan role dengan benar untuk Superadmin", async () => {
    renderComponent();
    expect(await screen.findByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("@superadmin")).toBeInTheDocument();
    expect(screen.getByText("Superadmin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simpan perubahan/i })).toBeInTheDocument();
  });

  it("mengizinkan Superadmin mengedit informasi profil", async () => {
    const user = userEvent.setup();
    mockUpdateUser.mockResolvedValueOnce({
      ...mockSuperadmin,
      profile: { ...mockSuperadmin.profile!, full_name: "Super Admin Updated" },
    });

    renderComponent();
    await screen.findByText("Super Admin");

    const nameInput = screen.getByDisplayValue("Super Admin");
    await user.clear(nameInput);
    await user.type(nameInput, "Super Admin Updated");

    const submitBtn = screen.getByRole("button", { name: /simpan perubahan/i });
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(1, expect.objectContaining({
        full_name: "Super Admin Updated",
      }));
    });
  });

  it("menampilkan form profil dalam mode read-only dan info kontak superadmin untuk non-superadmin", async () => {
    useSession.getState().setSession({
      access_token: "token",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      user: mockPentester,
    });

    // Mock me return pentester
    const authModule = await import("@/features/auth");
    vi.spyOn(authModule, "me").mockResolvedValueOnce(mockPentester);

    renderComponent();
    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Pentester")).toBeInTheDocument();
    expect(screen.getByText(/perubahan data profil.*dikelola secara terpusat oleh superadmin/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /simpan perubahan/i })).toBeNull();
  });

  it("mengizinkan user memperbarui password secara mandiri dengan verifikasi password lama", async () => {
    const user = userEvent.setup();
    mockChangePassword.mockResolvedValueOnce({});

    renderComponent();
    await screen.findByText("Super Admin");

    const oldPasswordInput = screen.getByPlaceholderText("Masukkan password saat ini");
    const newPasswordInput = screen.getByPlaceholderText("Masukkan password baru");
    const confirmPasswordInput = screen.getByPlaceholderText("Ulangi password baru");

    await user.type(oldPasswordInput, "Password123!");
    await user.type(newPasswordInput, "PasswordBaru456!");
    await user.type(confirmPasswordInput, "PasswordBaru456!");

    const submitBtn = screen.getByRole("button", { name: /perbarui password/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        old_password: "Password123!",
        new_password: "PasswordBaru456!",
      });
    });
  });

  it("menolak submit jika konfirmasi password baru tidak cocok", async () => {
    const user = userEvent.setup();

    renderComponent();
    await screen.findByText("Super Admin");

    const oldPasswordInput = screen.getByPlaceholderText("Masukkan password saat ini");
    const newPasswordInput = screen.getByPlaceholderText("Masukkan password baru");
    const confirmPasswordInput = screen.getByPlaceholderText("Ulangi password baru");

    await user.type(oldPasswordInput, "Password123!");
    await user.type(newPasswordInput, "PasswordBaru456!");
    await user.type(confirmPasswordInput, "PasswordBeda999!");

    const submitBtn = screen.getByRole("button", { name: /perbarui password/i });
    await user.click(submitBtn);

    expect(await screen.findByText("Konfirmasi password baru tidak cocok")).toBeInTheDocument();
    expect(mockChangePassword).not.toHaveBeenCalled();
  });
});
