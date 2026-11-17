import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { useSession } from "@/entities/session";
import { routes } from "./router";

vi.mock("@/pages/projects", () => ({ ProjectsPage: () => <p>halaman proyek</p> }));
vi.mock("@/pages/dashboard", () => ({ DashboardPage: () => <p>halaman dashboard</p> }));
vi.mock("@/pages/login", () => ({ LoginPage: () => <p>halaman login</p> }));
vi.mock("@/app/layouts", async () => {
  const { Outlet } = await import("react-router");
  return { AuthLayout: Outlet, DashboardLayout: Outlet };
});

const session = () =>
  useSession.setState({
    signedOut: false,
    token: "t",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    user: { sys_user_id: 1, username: "u", email: "u@t", role_id: 2, role: { role_id: 2, role_name: "tech_lead" } },
  });

function mount(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("keluar lalu login lagi", () => {
  it("keluar sengaja: /login tidak membawa halaman terakhir, jadi login berikutnya ke dashboard", async () => {
    session();
    const router = mount("/projects");
    await act(async () => {
      useSession.getState().signOut(); // sama dengan tombol Keluar; navigate("/login") menyusul
      await router.navigate("/login", { replace: true });
    });
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.state).toBeNull();
  });

  it("sesi habis di halaman terbuka tetap mengembalikan ke halaman itu setelah login", async () => {
    session();
    const router = mount("/projects");
    await act(async () => useSession.getState().clear());
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.state).toEqual({ from: "/projects" });
  });

  it("login baru menghapus penanda keluar sengaja, sesi habis berikutnya kembali mengingat halaman", async () => {
    session();
    useSession.getState().signOut();
    useSession.getState().setSession({
      access_token: "t2",
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      user: { sys_user_id: 1, username: "u", email: "u@t", role_id: 2, role: { role_id: 2, role_name: "tech_lead" } },
    });
    expect(useSession.getState().signedOut).toBe(false);
    const router = mount("/projects");
    await act(async () => useSession.getState().clear());
    expect(router.state.location.state).toEqual({ from: "/projects" });
  });
});
