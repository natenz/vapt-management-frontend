import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "@/entities/project";
import { useSession } from "@/entities/session";
import { ProjectDetailPage } from "./project-detail-page";

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

vi.mock("@svar-ui/react-gantt", () => ({
  Gantt: () => <div data-testid="gantt" />,
  Willow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  locateTask: () => null,
}));
vi.mock("@svar-ui/react-gantt/all.css", () => ({}));

let mockProjectDetail: ProjectDetail;
const baseProjectDetail: ProjectDetail = {
  project_id: 7,
  project_name: "Audit Keamanan Portal",
  client_name: "Telkom Corporate",
  start_date: "2026-11-01",
  end_date: "2026-11-30",
  total_mandays: 20,
  pm_id: 3,
  pm: {
    sys_user_id: 3,
    username: "pm.andi",
    email: "pm.andi@telkom.co.id",
    role: { role_name: "project_manager" },
    profile: { user_id: 3, full_name: "Andi Saputra" },
  },
  status: { status_process_id: 2, status_name: "Scoping" },
  resources: [
    {
      resource_id: 1,
      user_id: 5,
      user: {
        sys_user_id: 5,
        full_name: "Budi Santoso",
        sys_user: {
          sys_user_id: 5,
          username: "pentester.budi",
          profile: { user_id: 5, full_name: "Budi Santoso" },
        },
      },
    },
  ],
  assets: [
    {
      assets_id: 10,
      asset_name: "Web Portal",
      asset_type: "Web Application",
      mandays: 10,
    },
  ],
  mandays: [
    {
      mandays_id: 100,
      asset_id: 10,
      pentester_id: 5,
      allocated_mandays: 10,
      start_date: "2026-11-05",
      end_date: "2026-11-15",
    },
  ],
  stages: [],
} as unknown as ProjectDetail;

vi.mock("@/entities/project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/project")>();
  return {
    ...actual,
    getProject: vi.fn().mockImplementation(async () => mockProjectDetail),
    listStatuses: vi.fn().mockResolvedValue([
      { status_process_id: 1, status_name: "Draft" },
      { status_process_id: 2, status_name: "Scoping" },
      { status_process_id: 3, status_name: "Assessment" },
    ]),
  };
});

function mount(role: string, sysUserId: number, project: Partial<ProjectDetail> = {}) {
  mockProjectDetail = { ...baseProjectDetail, ...project } as ProjectDetail;
  useSession.setState({
    token: "t",
    user: { sys_user_id: sysUserId, username: "u", email: "u@t", role_id: 1, role: { role_id: 1, role_name: role } },
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/projects/7"]}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProjectDetailPage: alur 10 status (tanpa Planning)", () => {
  it("Tech Lead: Draft langsung kickoff ke Scoping", async () => {
    mount("tech_lead", 1, { status: { status_process_id: 1, status_name: "Draft" } });
    const kickoff = await screen.findByRole("button", { name: /Kickoff proyek/ });
    expect(kickoff).toBeEnabled();
    expect(screen.queryByText(/Serahkan ke Project Manager/)).not.toBeInTheDocument();
  });

  it("PM: di Scoping mengelola asset, Mulai Assessment tertahan bila ada asset tanpa pentester", async () => {
    mount("project_manager", 3, {
      assets: [
        ...baseProjectDetail.assets,
        { assets_id: 11, asset_name: "API Mobile", asset_type: "API", mandays: 5 },
      ] as ProjectDetail["assets"],
    });
    const start = await screen.findByRole("button", { name: /Mulai Assessment/ });
    expect(start).toBeDisabled();
    expect(screen.getByText(/Asset "API Mobile" belum di-assign pentester/)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Asset" })).getByText("API Mobile")).toBeInTheDocument();
  });

  it("PM: semua asset punya pentester, Mulai Assessment aktif", async () => {
    mount("project_manager", 3);
    expect(await screen.findByRole("button", { name: /Mulai Assessment/ })).toBeEnabled();
  });
});

describe("ProjectDetailPage", () => {
  it("merender halaman detail proyek dari status loading hingga selesai tanpa hook mismatch error", async () => {
    mount("tech_lead", 1);

    // Memastikan transisi dari loading skeleton ke loaded UI berjalan tanpa crash
    await waitFor(() => {
      expect(screen.getByText("Audit Keamanan Portal")).toBeInTheDocument();
    });

    expect(screen.getByText("Andi Saputra")).toBeInTheDocument();
    expect(screen.getByText("20 md")).toBeInTheDocument();
    expect(screen.getByText(/1 asset · 1 orang/)).toBeInTheDocument();
  });
});
