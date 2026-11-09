import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "@/entities/session";
import { routes } from "@/app/router";

const mockProject = {
  project_id: 1,
  project_name: "Project Test",
  client_name: "Client Test",
  total_mandays: 10,
  pm_id: 1,
  start_date: "2026-11-01",
  end_date: "2026-11-30",
  status_id: 1,
  status: { status_process_id: 1, status_name: "Planning" },
  pm: { sys_user_id: 1, username: "pm", email: "pm@test.com", role_id: 3 },
};

vi.mock("@/entities/project/api", () => ({
  listProjects: async () => ({ data: [mockProject], meta: { page: 1, limit: 10, total: 1 } }),
  getProject: async () => mockProject,
  listStatuses: async () => [{ status_process_id: 1, status_name: "Planning" }],
  listStatusLogs: async () => [],
  listResources: async () => [],
  listAssets: async () => [],
  listMandays: async () => [],
  changeProjectStatus: async () => mockProject,
  createProject: async () => mockProject,
  getWorkload: async () => ({}),
}));

vi.mock("@/entities/finding/api", () => ({
  listFindings: async () => [],
  getReport: async () => ({
    generated_at: "2026-11-09T00:00:00Z",
    project: mockProject,
    assets: [],
    summary: { total_findings: 0, by_severity: {}, by_status: {} },
    findings: [],
  }),
  createFinding: async () => ({}),
}));

vi.mock("@/entities/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/catalog")>();
  return {
    ...actual,
    listCatalog: async () => [],
    createCatalog: async () => ({}),
  };
});

vi.mock("@/entities/user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/user")>();
  return {
    ...actual,
    listUsers: async () => [],
    listRoles: async () => [],
  };
});

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Router Pages Smoke Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    useSession.getState().setSession({
      access_token: "smoke-test-token",
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

  const smokeTestRoutes = [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/projects", label: "Projects" },
    { path: "/projects/new", label: "New Project" },
    { path: "/projects/1", label: "Project Detail" },
    { path: "/projects/1/findings/new", label: "New Finding" },
    { path: "/projects/1/report", label: "Project Report" },
    { path: "/reports", label: "Reports Index" },
    { path: "/catalog", label: "Catalog" },
    { path: "/users", label: "Users" },
    { path: "/roles", label: "Roles" },
  ];

  it("merender halaman /login saat belum login", () => {
    useSession.getState().clear();
    const router = createMemoryRouter(routes, { initialEntries: ["/login"] });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    expect(container).toBeInTheDocument();
  });

  for (const { path, label } of smokeTestRoutes) {
    it(`merender rute ${path} (${label}) tanpa crash`, async () => {
      const router = createMemoryRouter(routes, { initialEntries: [path] });
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      );
      expect(container).toBeInTheDocument();
    });
  }
});
