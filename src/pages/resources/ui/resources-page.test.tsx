import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { User } from "@/entities/user";

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const u = (id: number, username: string, role: string, name: string, dept = "Offensive Security") =>
  ({
    sys_user_id: id,
    username,
    email: `${username}@x`,
    role_id: 1,
    role: { role_id: 1, role_name: role },
    profile: { user_id: id, full_name: name, department: dept },
  }) as User;

vi.mock("@/entities/user", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/user")>();
  return {
    ...actual,
    listUsers: async () => [
      u(1, "superadmin", "super_admin", "Super Admin"),
      u(2, "techlead", "tech_lead", "Tech Lead"),
      u(3, "pm.andi", "project_manager", "Andi"),
      u(5, "pentester.budi", "pentester", "Budi Santoso"),
      u(6, "pentester.citra", "pentester", "Citra Maharani"),
      u(7, "pentester.dimas", "pentester", "Dimas Wibowo"),
      u(8, "writer.eka", "technical_writer", "Eka Putri"),
    ],
  };
});

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
    expect(within(budi).queryByText("pentester.budi")).toBeNull();
    expect(within(budi).getByText("BS")).toBeInTheDocument();
    expect(within(budi).getByText("Pentester")).toBeInTheDocument();
    // Hanya fakta MD, tanpa penilaian "lewat batas" (belum ada aturan batas beban).
    const mdChip = within(budi).getByText("21 MD").closest("[data-slot='mandays-chip']")!;
    expect(mdChip).toHaveClass("rounded-xs", "border-0", "bg-surface-subtle");
    expect(within(budi).queryByText(/lewat batas/)).toBeNull();
    const hrisLink = within(budi).getByRole("link", { name: "VAPT HRIS" });
    expect(hrisLink).toHaveAttribute("href", "/projects/5");
    expect(hrisLink).toHaveClass("bg-project-chip-bg", "text-project-chip-fg", "rounded-xs");

    const citra = screen.getByText("Citra Maharani").closest("tr")!;
    expect(within(citra).getByText("8 MD")).toBeInTheDocument();
    const dimas = screen.getByText("Dimas Wibowo").closest("tr")!;
    expect(within(dimas).getByText("0 MD")).toBeInTheDocument();
    const eka = screen.getByText("Eka Putri").closest("tr")!;
    expect(within(eka).getByRole("link", { name: "VAPT E-Commerce" })).toBeInTheDocument();
    const andi = screen.getByText("Andi").closest("tr")!;
    expect(within(andi).queryByText(/MD/)).toBeNull();
  });

  it("menyaring resource melalui search input", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    const { ResourcesPage } = await import("./resources-page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Citra Maharani")).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", { name: "Cari resource" });
    await user.type(searchInput, "citra");

    expect(screen.getByText("Citra Maharani")).toBeInTheDocument();
    expect(screen.queryByText("Budi Santoso")).toBeNull();
    expect(screen.getByText("Menampilkan 1 dari 5 orang")).toBeInTheDocument();
  });

  it("dapat beralih ke tampilan Timeline Beban Kerja", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    const { ResourcesPage } = await import("./resources-page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/resources"]}>
          <ResourcesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Daftar Tim")).toBeInTheDocument();
    const timelineTab = screen.getByRole("tab", { name: "Timeline Beban Kerja" });
    await user.click(timelineTab);

    expect(timelineTab).toHaveAttribute("aria-selected", "true");
  });
});
