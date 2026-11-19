import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type React from "react";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { useSession } from "@/entities/session";
import { ProjectsPage } from "./projects-page";

const mockResources = [
  {
    resource_id: 101,
    user_id: 201,
    user: {
      user_id: 201,
      full_name: "Budi Santoso",
      sys_user_id: 201,
      sys_user: {
        sys_user_id: 201,
        username: "budi",
        email: "budi@vapt.local",
        role_id: 5,
        role: { role_id: 5, role_name: "technical_writer" },
      },
    },
  },
  {
    resource_id: 102,
    user_id: 202,
    user: {
      user_id: 202,
      full_name: "Aldi Pratama",
      sys_user_id: 202,
      sys_user: {
        sys_user_id: 202,
        username: "aldi",
        email: "aldi@vapt.local",
        role_id: 4,
        role: { role_id: 4, role_name: "pentester" },
      },
    },
  },
  {
    resource_id: 103,
    user_id: 300,
    user: {
      user_id: 300,
      full_name: "PM Sari",
      sys_user_id: 300,
      sys_user: {
        sys_user_id: 300,
        username: "pm.sari",
        email: "pm.sari@vapt.local",
        role_id: 3,
        role: { role_id: 3, role_name: "project_manager" },
      },
    },
  },
];

const mockProjects = [
  {
    project_id: 1,
    project_name: "VAPT Internet Banking",
    client_name: "Bank Telkom",
    start_date: "2026-01-01",
    end_date: "2026-01-30",
    total_mandays: 15,
    pm: { profile: { full_name: "Andi Wijaya" } },
    status: { status_process_id: 11, status_name: "Done" },
    resources: mockResources,
  },
  {
    project_id: 2,
    project_name: "VAPT Mobile Banking",
    client_name: "Telkom Fin",
    start_date: "2026-02-01",
    end_date: "2026-02-28",
    total_mandays: 12,
    pm: { profile: { full_name: "Sari Indah" } },
    status: { status_process_id: 8, status_name: "Retesting" },
    resources: mockResources,
  },
];

// SVAR Gantt membutuhkan layout browser; di jsdom diganti stub sederhana
vi.mock("@svar-ui/react-gantt", () => ({
  Willow: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  locateTask: () => null,
  Gantt: ({ tasks }: { tasks: { id: string; text: string }[] }) => (
    <div data-testid="gantt">
      {tasks.map((t) => (
        <span key={t.id}>{t.text}</span>
      ))}
    </div>
  ),
}));
vi.mock("@svar-ui/react-gantt/all.css", () => ({}));

vi.mock("@/entities/project", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/project")>()),
  listProjects: async () => ({
    data: mockProjects,
    meta: { page: 1, limit: 100, total: 2 },
  }),
  listAllProjects: async () => ({
    data: mockProjects,
    meta: { page: 1, limit: 100, total: 2 },
  }),
  listResources: async () => mockResources,
  listStatuses: async () => [
    { status_process_id: 11, status_name: "Done" },
    { status_process_id: 8, status_name: "Retesting" },
  ],
}));

function renderPage(roleName: "super_admin" | "tech_lead" | "project_manager" | "pentester" = "super_admin") {
  useSession.setState({
    token: "token",
    user: {
      sys_user_id: 1,
      username: "admin",
      email: "admin@vapt.local",
      role_id: 1,
      role: {
        role_id: roleName === "tech_lead" ? 2 : roleName === "project_manager" ? 3 : roleName === "pentester" ? 4 : 1,
        role_name: roleName,
      },
    },
  });

  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectsPage - filter tabel", () => {
  // Radix Select/DropdownMenu membutuhkan API yang tidak tersedia di jsdom
  beforeAll(() => {
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
  });

  const rowNames = () =>
    screen
      .queryAllByRole("link")
      .map((a) => a.textContent)
      .filter((t) => t?.startsWith("VAPT"));

  it("pencarian menyaring baris dan menampilkan ringkasan hasil", async () => {
    renderPage();
    await screen.findByText("VAPT Mobile Banking");

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari proyek" }), {
      target: { value: "mobile" },
    });

    expect(rowNames()).toEqual(["VAPT Mobile Banking"]);
    expect(screen.getByText("Menampilkan 1 dari 2 proyek")).toBeInTheDocument();
  });

  it("filter status multi-pilih dan tombol reset", async () => {
    renderPage();
    await screen.findByText("VAPT Mobile Banking");

    fireEvent.keyDown(screen.getByRole("button", { name: "Filter Status" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: /^Done/ }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    expect(rowNames()).toEqual(["VAPT Internet Banking"]);
    expect(screen.getByRole("button", { name: "Filter Status: Done" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filter" }));
    expect(rowNames()).toHaveLength(2);
    expect(screen.getByText("2 proyek")).toBeInTheDocument();
  });

  it("menampilkan empty state dengan aksi reset saat tidak ada hasil", async () => {
    renderPage();
    await screen.findByText("VAPT Mobile Banking");

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari proyek" }), {
      target: { value: "tidak-ada" },
    });

    expect(screen.getByText("Tidak ada proyek yang cocok")).toBeInTheDocument();
    const resetButtons = screen.getAllByRole("button", { name: "Reset filter" });
    fireEvent.click(resetButtons[resetButtons.length - 1]!);
    expect(rowNames()).toHaveLength(2);
  });

  it("tampilan Timeline menyembunyikan grafik dan tabel; Overview menampilkannya kembali", async () => {
    const { container } = renderPage();
    await screen.findByText("VAPT Mobile Banking");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Timeline" }), { button: 0 });

    expect(container.querySelector('[data-slot="project-timeline"]')).toBeInTheDocument();
    expect(container.querySelector("table")).toBeNull();
    expect(screen.queryByRole("searchbox", { name: "Cari proyek" })).toBeNull();
    expect(container.querySelector('[data-slot="project-schedule-chart"]')).toBeNull();

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Overview" }), { button: 0 });
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByText("VAPT Mobile Banking")).toBeInTheDocument();
  });

  it("menyediakan dropdown jumlah baris per halaman", async () => {
    renderPage();
    await screen.findByText("VAPT Mobile Banking");

    const pageSize = screen.getByRole("combobox", { name: "Jumlah baris per halaman" });
    expect(pageSize).toHaveTextContent("20");

    fireEvent.keyDown(pageSize, { key: "Enter" });
    expect(await screen.findByRole("option", { name: "10" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "50" }));
    expect(screen.getByRole("combobox", { name: "Jumlah baris per halaman" })).toHaveTextContent(
      "50",
    );
  });
});

describe("ProjectsPage", () => {
  it("menggunakan label Projects untuk Tech Lead", async () => {
    renderPage("tech_lead");
    await screen.findByText("VAPT Mobile Banking");

    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Cari projects" })).toBeInTheDocument();
    expect(screen.getByText("2 projects")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buat Template Projects" })).toHaveAttribute("href", "/projects/new");
  });

  it("menggunakan label Projects untuk Project Manager", async () => {
    renderPage("project_manager");
    await screen.findByText("VAPT Mobile Banking");

    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Cari projects" })).toBeInTheDocument();
    expect(screen.getByText("2 projects")).toBeInTheDocument();
  });

  it("menggunakan label Projects tanpa deskripsi untuk Pentester", async () => {
    renderPage("pentester");
    await screen.findByText("VAPT Mobile Banking");

    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
    expect(screen.queryByText("Projects yang bisa kamu buka.")).not.toBeInTheDocument();
  });

  it("merender judul halaman Proyek tanpa logo", () => {
    renderPage();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Proyek");
    expect(heading.querySelector("svg")).toBeNull();
  });

  it("merender setiap judul kolom tabel dengan ikon representatif di sebelah kiri", async () => {
    const { container } = renderPage();
    const thead = container.querySelector("thead");
    expect(thead).not.toBeNull();

    const ths = thead!.querySelectorAll("th");
    expect(ths.length).toBe(6);

    const theadScope = within(thead!);
    expect(theadScope.getByText("Proyek")).toBeInTheDocument();
    expect(theadScope.getByText("Klien")).toBeInTheDocument();
    expect(theadScope.getByText("Rentang tanggal")).toBeInTheDocument();
    expect(theadScope.getByText("Mandays")).toBeInTheDocument();
    expect(theadScope.getByText("Resources")).toBeInTheDocument();
    expect(theadScope.getByText("Status")).toBeInTheDocument();

    // Setiap th memiliki SVG icon
    ths.forEach((th) => {
      expect(th.querySelector("svg")).not.toBeNull();
    });
  });

  it("merender baris proyek dengan chip logo pastel borderless dan nama status di luar chip", async () => {
    renderPage();
    const doneText = await screen.findByText("Done");
    expect(doneText).toBeInTheDocument();

    const badge = doneText.closest('[data-slot="project-status-badge"]');
    expect(badge).not.toBeNull();

    const chip = badge?.querySelector('[data-slot="project-status-chip"]');
    expect(chip).not.toBeNull();
    expect(chip).toHaveClass("rounded-sm");
    expect(chip).toHaveClass("border-0");
    expect(chip).toHaveClass("bg-green-50");
    expect(chip?.querySelector("svg")).not.toBeNull();
    expect(chip?.textContent?.trim()).toBe(""); // Chip hanya memuat logo, nama status tidak di dalam chip
  });

  it("pada role super_admin, kolom Resources mengikutsertakan PM dalam tim", async () => {
    renderPage();
    const resourceButtons = await screen.findAllByRole("button", {
      name: /Lihat (info|detail) resource proyek/i,
    });
    expect(resourceButtons.length).toBeGreaterThan(0);

    const firstBtn = resourceButtons[0];
    expect(firstBtn).toBeInTheDocument();
    // Pada super_admin, PM (Andi Wijaya -> AW) di-include dalam avatar stack
    expect(within(firstBtn!).getByText("AW")).toBeInTheDocument();
  });

  it("pada role project_manager, menampilkan kolom Resources dengan avatar anggota selain PM dan popover detail", async () => {
    useSession.setState({
      token: "token",
      user: {
        sys_user_id: 300,
        username: "pm.sari",
        email: "pm.sari@vapt.local",
        role_id: 3,
        role: { role_id: 3, role_name: "project_manager" },
      },
    });

    const { container } = render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <ProjectsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Header harus Resources, bukan PM
    const thead = container.querySelector("thead");
    expect(within(thead!).getByText("Resources")).toBeInTheDocument();
    expect(within(thead!).queryByText("PM")).toBeNull();

    // Di baris tabel, tampil avatar stack (hanya memuat profil Budi dan Aldi, tidak memuat PM Sari)
    const resourceButtons = await screen.findAllByRole("button", {
      name: /Lihat (info|detail) resource proyek/i,
    });
    expect(resourceButtons.length).toBeGreaterThan(0);

    const firstBtn = resourceButtons[0];
    expect(firstBtn).toBeInTheDocument();
    // Budi (BS) dan Aldi (AP) ada di avatar stack
    expect(within(firstBtn!).getByText("BS")).toBeInTheDocument();
    expect(within(firstBtn!).getByText("AP")).toBeInTheDocument();
    // PM Sari (PS) tidak ada di avatar stack karena dia adalah user login
    expect(within(firstBtn!).queryByText("PS")).toBeNull();
  });
});
