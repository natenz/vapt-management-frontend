import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/entities/session";
import type { RoleDetail, User } from "@/entities/user";
import { UsersPage } from "./users-page";

const mockUsers: User[] = [
  {
    sys_user_id: 1,
    username: "superadmin",
    email: "superadmin@vapt.local",
    role_id: 1,
    role: { role_id: 1, role_name: "super_admin" },
    profile: { user_id: 1, full_name: "Super Admin", department: "IT Security", phone_number: "0811111111" },
  },
  {
    sys_user_id: 4,
    username: "pentester.budi",
    email: "budi@vapt.local",
    role_id: 4,
    role: { role_id: 4, role_name: "pentester" },
    profile: { user_id: 4, full_name: "Budi Santoso", department: "Offensive Security", phone_number: "081234567890" },
  },
];

const mockRoles: RoleDetail[] = [
  { role_id: 1, role_name: "super_admin", description: "Super Admin" },
  { role_id: 4, role_name: "pentester", description: "Pentester" },
];

const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockDeleteUser = vi.fn();

vi.mock("@/entities/user", () => ({
  listUsers: async () => mockUsers,
  listRoles: async () => mockRoles,
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
}));

describe("UsersPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useSession.getState().setSession({
      access_token: "token",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      user: {
        sys_user_id: 1,
        username: "superadmin",
        email: "superadmin@vapt.local",
        role_id: 1,
        role: { role_id: 1, role_name: "super_admin" },
        profile: { user_id: 1, full_name: "Super Admin" },
      },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <UsersPage />
      </QueryClientProvider>,
    );

  it("merender daftar pengguna beserta role dan aksinya", async () => {
    renderComponent();
    expect(await screen.findByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("@superadmin")).toBeInTheDocument();
    expect(screen.getByText("@pentester.budi")).toBeInTheDocument();
    expect(screen.getByText("superadmin@vapt.local")).toBeInTheDocument();
    expect(screen.getByText("budi@vapt.local")).toBeInTheDocument();
  });

  it("membuka modal tambah pengguna dan berhasil submit data baru", async () => {
    const user = userEvent.setup();
    mockCreateUser.mockResolvedValueOnce({
      sys_user_id: 9,
      username: "pentester.baru",
      email: "pentester.baru@vapt.local",
      role_id: 4,
      role: { role_id: 4, role_name: "pentester" },
      profile: { user_id: 9, full_name: "Pentester Baru" },
    });

    renderComponent();
    await screen.findByText("Super Admin");

    // Klik tombol Tambah User
    const addButton = screen.getByRole("button", { name: /tambah user/i });
    await user.click(addButton);

    expect(screen.getByRole("heading", { name: /tambah pengguna baru/i })).toBeInTheDocument();

    // Isi field form
    const nameInput = screen.getByPlaceholderText("Pentester Baru");
    const usernameInput = screen.getByPlaceholderText("pentester.baru");
    const emailInput = screen.getByPlaceholderText("pentester.baru@vapt.local");
    const passwordInput = screen.getByPlaceholderText("Minimal 8 karakter");

    await user.type(nameInput, "Pentester Baru");
    await user.type(usernameInput, "pentester.baru");
    await user.type(emailInput, "pentester.baru@vapt.local");
    await user.type(passwordInput, "Password123!");

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /simpan user/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith({
        full_name: "Pentester Baru",
        username: "pentester.baru",
        email: "pentester.baru@vapt.local",
        password: "Password123!",
        role_id: 4,
        phone_number: undefined,
        department: undefined,
      });
    });
  });

  it("menonaktifkan tombol hapus untuk akun diri sendiri", async () => {
    renderComponent();
    await screen.findByText("Super Admin");

    const deleteSelfBtn = screen.getByRole("button", { name: "Hapus superadmin" });
    expect(deleteSelfBtn).toBeDisabled();

    const deleteOtherBtn = screen.getByRole("button", { name: "Hapus pentester.budi" });
    expect(deleteOtherBtn).not.toBeDisabled();
  });

  it("membuka konfirmasi hapus dan memanggil deleteUser saat dikonfirmasi", async () => {
    const user = userEvent.setup();
    mockDeleteUser.mockResolvedValueOnce({});

    renderComponent();
    await screen.findByText("Budi Santoso");

    const deleteBtn = screen.getByRole("button", { name: "Hapus pentester.budi" });
    await user.click(deleteBtn);

    expect(screen.getByRole("heading", { name: /hapus pengguna/i })).toBeInTheDocument();
    expect(screen.getByText(/apakah anda yakin ingin menghapus akun/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /ya, hapus pengguna/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith(4);
    });
  });

  it("membuka modal edit dan memanggil updateUser saat disimpan", async () => {
    const user = userEvent.setup();
    mockUpdateUser.mockResolvedValueOnce({
      sys_user_id: 4,
      username: "pentester.budi",
      email: "budi.updated@vapt.local",
      role_id: 4,
    });

    renderComponent();
    await screen.findByText("Budi Santoso");

    const editBtn = screen.getByRole("button", { name: "Ubah pentester.budi" });
    await user.click(editBtn);

    expect(screen.getByRole("heading", { name: /ubah data pengguna/i })).toBeInTheDocument();

    const emailInput = screen.getByDisplayValue("budi@vapt.local");
    await user.clear(emailInput);
    await user.type(emailInput, "budi.updated@vapt.local");

    const saveBtn = screen.getByRole("button", { name: /simpan perubahan/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith(4, expect.objectContaining({
        email: "budi.updated@vapt.local",
      }));
    });
  });
});
