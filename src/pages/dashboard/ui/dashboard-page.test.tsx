import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { useSession } from "@/entities/session";
import { stageIndexForStatus, statusBetween } from "@/entities/project";

const p = (id: number, name: string, status: string) => ({
  project_id: id,
  project_name: name,
  client_name: "Klien",
  total_mandays: 5,
  pm_id: 1,
  end_date: "2099-12-31",
  status: { status_process_id: id, status_name: status },
});

// BE sudah menyaring proyek per role (access.go roleStatuses); mock mewakili jawaban BE.
vi.mock("@/entities/project", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/project")>()),
  listProjects: async () => ({
    data: [p(1, "Proyek Uji", "Assessment"), p(4, "Proyek Remediasi", "Remediasi"), p(2, "Proyek Laporan", "Initial Report")],
    meta: { page: 1, limit: 100, total: 3 },
  }),
}));

vi.mock("@/entities/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/catalog")>()),
  listCatalog: async () => [
    { vulna_id: 7, title: "Stored XSS", severity: "High", status: "pending" },
    { vulna_id: 9, title: "IDOR profil", severity: "Medium", status: "pending" },
  ],
}));

vi.mock("@/entities/finding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/finding")>()),
  listFindings: async () => [],
}));

async function mount(role: string) {
  useSession.setState({ token: "t", user: { sys_user_id: 4, username: "u", email: "u@t", role_id: 4, role: { role_id: 4, role_name: role } } });
  const { DashboardPage } = await import("./dashboard-page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><DashboardPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  it("pentester: Assessment masuk Giliran Anda, Remediasi dan Initial Report hanya dipantau", async () => {
    await mount("pentester");
    const turn = await screen.findByRole("region", { name: "Giliran Anda" });
    expect(within(turn).getByText("Proyek Uji")).toBeInTheDocument();
    expect(within(turn).getByText("Uji aset dan catat temuan")).toBeInTheDocument();
    const watch = screen.getByRole("region", { name: "Sedang berjalan" });
    expect(within(watch).getByText("Proyek Remediasi")).toBeInTheDocument();
    expect(within(watch).getByText("Proyek Laporan")).toBeInTheDocument();
  });

  it("tech lead: antrean ACC katalog dari pentest dan 5 proyek terakhir, tanpa tabel giliran", async () => {
    await mount("tech_lead");
    const acc = await screen.findByRole("region", { name: "ACC katalog dari pentest" });
    expect(within(acc).getByText("Stored XSS")).toBeInTheDocument();
    expect(within(acc).getByText("IDOR profil")).toBeInTheDocument();
    expect(within(acc).getByRole("link", { name: /Tinjau dan setujui/ })).toHaveAttribute("href", "/catalog");
    const latest = screen.getByRole("region", { name: "Proyek terakhir" });
    const rows = within(latest).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3); // mock punya 3 proyek; id terbesar di atas
    expect(rows[0]).toHaveTextContent("Proyek Remediasi");
    expect(screen.queryByRole("region", { name: "Giliran Anda" })).not.toBeInTheDocument();
  });

  it("role lain tidak melihat kotak ringkasan Tech Lead", async () => {
    await mount("pentester");
    await screen.findByRole("region", { name: "Giliran Anda" });
    expect(screen.queryByRole("region", { name: "ACC katalog dari pentest" })).not.toBeInTheDocument();
  });

  it("tech writer: Initial Report jadi giliran, Assessment hanya dipantau", async () => {
    await mount("technical_writer");
    const turn = await screen.findByRole("region", { name: "Giliran Anda" });
    expect(within(turn).getByText("Proyek Laporan")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Sedang berjalan" })).getByText("Proyek Uji")).toBeInTheDocument();
  });
});

describe("stageIndexForStatus", () => {
  it("status 3-10 = tahap timeline; Draft/Planning belum kickoff", () => {
    expect(stageIndexForStatus("Planning")).toBe(-1);
    expect(stageIndexForStatus("Scoping")).toBe(0);
    expect(stageIndexForStatus("Remediasi")).toBe(4);
    expect(stageIndexForStatus("Final Presentation")).toBe(7);
    expect(stageIndexForStatus("Done")).toBe(8);
    expect(statusBetween("Retesting", "Initial Report", "Done")).toBe(true);
    expect(statusBetween("Analysis", "Initial Report", "Done")).toBe(false);
  });
});
