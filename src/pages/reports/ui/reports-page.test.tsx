import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ProjectReport } from "@/entities/finding";

const report = {
  generated_at: "2026-11-09T00:00:00Z",
  project: { project_id: 4, project_name: "VAPT E-Commerce", client_name: "X", total_mandays: 13, pm_id: 1, start_date: "2026-10-01", end_date: "2026-10-30" },
  assets: [
    { assets_id: 6, asset_name: "Storefront", asset_type: "web", mandays: 8, project_id: 4, domain: "shop.x.id" },
    { assets_id: 7, asset_name: "Checkout API", asset_type: "api", mandays: 5, project_id: 4 },
    { assets_id: 8, asset_name: "Asset Kosong", asset_type: "web", mandays: 1, project_id: 4 },
  ],
  summary: { total_findings: 3, by_severity: { High: 2, Low: 1 }, by_status: {} },
  findings: [
    { vulna_id: 1, custom_title: "SQLi login", severity: "High", status: "open", pentester_id: 1, project_id: 4, asset_id: 6 },
    { vulna_id: 2, custom_title: "Weak JWT", severity: "High", status: "open", pentester_id: 1, project_id: 4, asset_id: 7 },
    { vulna_id: 3, custom_title: "Verbose errors", severity: "Low", status: "open", pentester_id: 1, project_id: 4, asset_id: 7 },
  ],
} as unknown as ProjectReport;

vi.mock("@/entities/finding", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/finding")>();
  return {
    ...actual,
    getReport: async () => report,
  };
});

vi.mock("@/entities/project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/project")>();
  return {
    ...actual,
    listProjects: async () => ({
      data: [
        {
          project_id: 4,
          project_name: "VAPT E-Commerce",
          client_name: "Klien Telkom",
          start_date: "2026-10-01",
          end_date: "2026-10-30",
          status: { status_process_id: 6, status_name: "Initial Report" },
        },
      ],
      meta: { page: 1, limit: 100, total: 1 },
    }),
  };
});

// jsdom tidak punya dua API ini; Tabs memakainya untuk chevron dan auto-scroll chip.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

describe("ReportPage", () => {
  it("dua tab: Report Proyek (semua findings) dan Report per Asset (dikelompokkan, asset kosong tetap tampil)", async () => {
    const user = userEvent.setup();
    const { ReportPage } = await import("./reports-page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/projects/4/report"]}>
          <Routes><Route path="/projects/:projectId/report" element={<ReportPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("SQLi login")).toBeInTheDocument();
    expect(screen.getAllByText(/Weak JWT|Verbose errors|SQLi login/)).toHaveLength(3);

    await user.click(screen.getByRole("tab", { name: /Report per Asset/ }));
    const checkout = await screen.findByRole("region", { name: "Report asset Checkout API" });
    expect(within(checkout).getAllByText(/Weak JWT|Verbose errors/)).toHaveLength(2);
    expect(within(checkout).queryByText("SQLi login")).toBeNull();
    const kosong = screen.getByRole("region", { name: "Report asset Asset Kosong" });
    expect(within(kosong).getByText("Tidak ada findings pada asset ini.")).toBeInTheDocument();
  });
});

describe("ReportsIndexPage", () => {
  it("merender tabel proyek siap report beserta toolbar dan aksinya", async () => {
    const { ReportsIndexPage } = await import("./reports-page");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ReportsIndexPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("VAPT E-Commerce")).toBeInTheDocument();
    expect(screen.getByText("Klien Telkom")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka Report" })).toHaveAttribute(
      "href",
      "/projects/4/report",
    );
    expect(screen.getByText("1 reports")).toBeInTheDocument();
  });
});
