import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ProjectReport } from "@/shared/api/schemas";

const report = {
  generated_at: "2026-11-09T00:00:00Z",
  project: { project_id: 4, project_name: "VAPT E-Commerce", client_name: "X", total_mandays: 13, pm_id: 1, start_date: "2026-10-01", end_date: "2026-10-30" },
  assets: [
    { assets_id: 6, asset_name: "Storefront", asset_type: "web", mandays: 8, project_id: 4, domain: "shop.x.id" },
    { assets_id: 7, asset_name: "Checkout API", asset_type: "api", mandays: 5, project_id: 4 },
    { assets_id: 8, asset_name: "Aset Kosong", asset_type: "web", mandays: 1, project_id: 4 },
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

// jsdom tidak punya dua API ini; Tabs memakainya untuk chevron dan auto-scroll chip.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

describe("ReportPage", () => {
  it("dua tab: Laporan Proyek (semua temuan) dan Laporan per Aset (dikelompokkan, aset kosong tetap tampil)", async () => {
    const { ReportPage } = await import("./ui");
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={["/projects/4/report"]}>
          <Routes><Route path="/projects/:projectId/report" element={<ReportPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("SQLi login")).toBeInTheDocument();
    expect(screen.getAllByText(/Weak JWT|Verbose errors|SQLi login/)).toHaveLength(3);

    await userEvent.click(screen.getByRole("tab", { name: /Laporan per Aset/ }));
    const checkout = await screen.findByRole("region", { name: "Laporan aset Checkout API" });
    expect(within(checkout).getAllByText(/Weak JWT|Verbose errors/)).toHaveLength(2);
    expect(within(checkout).queryByText("SQLi login")).toBeNull();
    const kosong = screen.getByRole("region", { name: "Laporan aset Aset Kosong" });
    expect(within(kosong).getByText("Tidak ada temuan pada aset ini.")).toBeInTheDocument();
  });
});
