import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@/entities/user";

const u = (id: number, username: string, role: string, name: string, dept = "Offensive Security") =>
  ({
    sys_user_id: id,
    username,
    email: `${username}@x`,
    role_id: 1,
    role: { role_id: 1, role_name: role },
    profile: { user_id: id, full_name: name, department: dept },
  }) as User;

vi.mock("@/entities/user", () => ({
  listUsers: async () => [
    u(1, "superadmin", "super_admin", "Super Admin"),
    u(2, "techlead", "tech_lead", "Tech Lead"),
    u(3, "pm.andi", "project_manager", "Andi"),
    u(5, "pentester.budi", "pentester", "Budi Santoso"),
    u(6, "pentester.citra", "pentester", "Citra Maharani"),
    u(8, "writer.eka", "technical_writer", "Eka Putri"),
  ],
}));

vi.mock("@/entities/project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/project")>();
  return {
    ...actual,
    getResourceLoad: async () => ({
      5: { mandays: 21, projects: [{ id: 3, name: "VAPT Payment" }, { id: 5, name: "VAPT HRIS" }] },
      6: { mandays: 8, projects: [{ id: 5, name: "VAPT HRIS" }] },
      8: { mandays: 0, projects: [{ id: 4, name: "VAPT E-Commerce" }] },
    }),
  };
});

describe("ResourcesPage", () => {
  it("menampilkan pentester, writer, dan PM (bukan admin/TL) dengan beban dan proyek aktif dari BE", async () => {
    const { ResourcesPage } = await import("./resources-page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.queryByText("Super Admin")).toBeNull();
    expect(screen.queryByText("Tech Lead")).toBeNull();

    const budi = screen.getByText("Budi Santoso").closest("tr")!;
    expect(within(budi).getByText(/21 md · penuh/)).toBeInTheDocument();
    expect(within(budi).getByRole("link", { name: "VAPT HRIS" })).toHaveAttribute("href", "/projects/5");
    const citra = screen.getByText("Citra Maharani").closest("tr")!;
    expect(within(citra).getByText("8 md")).toBeInTheDocument();
    const eka = screen.getByText("Eka Putri").closest("tr")!;
    expect(within(eka).getByRole("link", { name: "VAPT E-Commerce" })).toBeInTheDocument();
    const andi = screen.getByText("Andi").closest("tr")!;
    expect(within(andi).queryByText(/md/)).toBeNull();
  });
});
