import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
const projectsResponse = {
  data: [p(1, "Proyek Uji", "Assessment"), p(4, "Proyek Remediasi", "Remediasi"), p(2, "Proyek Laporan", "Initial Report")],
  meta: { page: 1, limit: 100, total: 3 },
};
const api = vi.hoisted(() => ({ getReport: vi.fn() }));

vi.mock("@/entities/project", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/project")>()),
  listProjects: async () => projectsResponse,
  listAllProjects: async () => projectsResponse,
  listActiveProjectDetails: async () => [],
  getProject: async (id: number) => ({
    ...projectsResponse.data.find((x) => x.project_id === id)!,
    assets: [],
    resources: [],
    stages: [],
    mandays: [],
  }),
  listStatuses: async () => [],
  listStatusLogs: async (id: number) => [
    { status_process_log_id: id, status_name: "Assessment", status_create_at: "2026-11-18T08:00:00Z" },
  ],
  getResourceLoad: async () => ({
    5: { mandays: 22, projects: [] },
  }),
}));

vi.mock("@/entities/user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/user")>()),
  listUsers: async () => [
    { sys_user_id: 5, username: "pentester.budi", role: { role_name: "pentester" }, profile: { full_name: "Budi Santoso" } },
    { sys_user_id: 3, username: "pm.andi", role: { role_name: "project_manager" }, profile: { full_name: "Andi PM" } },
  ],
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
  getReport: api.getReport,
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
  it("pentester: bento prioritas kerja, Assessment di atas, Remediasi/Initial Report menunggu role lain", async () => {
    await mount("pentester");
    expect(await screen.findByRole("region", { name: "Ringkasan Kerja Pentester" })).toBeInTheDocument();
    const priority = screen.getByRole("region", { name: "Prioritas Kerja" });
    const rows = await within(priority).findAllByRole("row");
    // baris 0 = header; giliran pentester (Assessment) paling atas
    expect(within(rows[1]!).getByText("Proyek Uji")).toBeInTheDocument();
    expect(within(rows[1]!).getByText("Uji aset dan catat temuan")).toBeInTheDocument();
    expect(within(priority).getAllByText("Menunggu role lain")).toHaveLength(2);
    for (const name of ["Linimasa Saya", "Proyek Baru", "Siap Diuji Ulang", "Temuan Saya"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("region", { name: "Giliran Anda" })).not.toBeInTheDocument();
  });

  it("tech lead: menampilkan ringkasan operasional dengan CTA katalog, proyek berjalan & progres, dan penugasan pentester", async () => {
    await mount("tech_lead");
    const summarySec = await screen.findByRole("region", { name: "Ringkasan Operasional Tech Lead" });
    expect(summarySec).toBeInTheDocument();
    expect(within(summarySec).getByRole("link", { name: /Tinjau/ })).toHaveAttribute("href", "/catalog?status=pending");

    const projectsSec = screen.getByRole("region", { name: "Proyek Berjalan & Progres" });
    expect(within(projectsSec).getByText("Proyek Uji")).toBeInTheDocument();
    expect(within(projectsSec).getByText("Proyek Remediasi")).toBeInTheDocument();

    const resourceSec = screen.getByRole("region", { name: "Penugasan Pentester Mingguan" });
    expect(await within(resourceSec).findByText("Budi Santoso")).toBeInTheDocument();
    expect(within(resourceSec).getByRole("link", { name: /Cek Benturan Jadwal di Linimasa/ })).toHaveAttribute("href", "/resources?tampilan=timeline");

    expect(screen.queryByRole("region", { name: "Persetujuan Usulan Katalog Kerentanan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Perencana Slot Proyek Baru" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Giliran Anda" })).not.toBeInTheDocument();
  });

  it("role lain tidak melihat kotak ringkasan Tech Lead", async () => {
    await mount("pentester");
    await screen.findByRole("region", { name: "Prioritas Kerja" });
    expect(screen.queryByRole("region", { name: "Ringkasan Operasional Tech Lead" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Persetujuan Usulan Katalog Kerentanan" })).not.toBeInTheDocument();
  });

  it("tech writer: Initial Report di atas antrean laporan dan membuka halaman report", async () => {
    api.getReport.mockReset();
    api.getReport.mockImplementation(async (id: number) => ({
      generated_at: "",
      project: projectsResponse.data.find((x) => x.project_id === id)!,
      assets: [],
      summary: { total_findings: 1 },
      findings: [{ vulna_id: id, custom_title: `Temuan ${id}`, severity: "High", status: "open", evidences: [] }],
    }));
    await mount("technical_writer");
    expect(await screen.findByRole("region", { name: "Ringkasan Kerja Technical Writer" })).toBeInTheDocument();
    const queue = screen.getByRole("region", { name: "Antrean Laporan" });
    const rows = await within(queue).findAllByRole("row");
    expect(within(rows[1]!).getByRole("link", { name: /Proyek Laporan/ })).toHaveAttribute("href", "/projects/2/report");
    expect(within(rows[1]!).getByText("Koreksi temuan dan susun Initial Report")).toBeInTheDocument();
    expect(within(queue).getAllByText("Menunggu role lain")).toHaveLength(2);
    const quality = screen.getByRole("region", { name: "Kelengkapan Temuan" });
    expect(await within(quality).findByText("Temuan 2")).toBeInTheDocument();
    for (const name of ["Linimasa Saya", "Volume Temuan"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
  });

  it("project manager: 3 KPI, Proyek Berjalan berdampingan dengan Perlu Tindakan Anda, kartu lain tidak ada", async () => {
    api.getReport.mockReset();
    api.getReport.mockImplementation(async (id: number) => ({
      generated_at: "",
      project: projectsResponse.data.find((x) => x.project_id === id)!,
      assets: [],
      summary: { total_findings: 1 },
      findings: [{ vulna_id: id, custom_title: `Temuan ${id}`, severity: "High", status: "open" }],
    }));
    await mount("project_manager");
    const summary = await screen.findByRole("region", { name: "Ringkasan Proyek Project Manager" });
    for (const label of ["Proyek Saya", "Jadwal Bermasalah", "Total Temuan"]) {
      expect(within(summary).getByText(label)).toBeInTheDocument();
    }
    expect(within(summary).queryByText("Temuan Terbuka")).not.toBeInTheDocument();
    expect(within(summary).queryByText("Persiapan Assessment")).not.toBeInTheDocument();

    expect(screen.getByRole("region", { name: "Proyek Berjalan & Progres" })).toBeInTheDocument();
    const action = screen.getByRole("region", { name: "Perlu Tindakan Anda" });
    // Hanya giliran PM: Remediasi tampil, Assessment/Initial Report (role lain) tidak
    const link = await within(action).findByRole("link", { name: /Proyek Remediasi/ });
    expect(link).toHaveAttribute("href", "/projects/4");
    expect(within(action).getByText("Mulai Retesting setelah klien selesai memperbaiki")).toBeInTheDocument();
    expect(within(action).queryByText("Proyek Uji")).not.toBeInTheDocument();

    for (const name of ["Kesiapan Assessment", "Progres Remediasi", "Linimasa Saya"]) {
      expect(screen.queryByRole("region", { name })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /^Laporan$/ })).toHaveAttribute("href", "/reports");
  });

  it("super admin: bento lintas modul (proyek, temuan, tim, katalog, aktivitas)", async () => {
    api.getReport.mockReset();
    api.getReport.mockImplementation(async (id: number) => {
      // Satu report gagal tidak boleh menjatuhkan kartu lain
      if (id === 2) throw new Error("gagal");
      const project = projectsResponse.data.find((x) => x.project_id === id)!;
      return {
        generated_at: "",
        project,
        assets: [],
        summary: { total_findings: 1 },
        findings: [{ vulna_id: id, custom_title: "SQLi", severity: "Critical", status: "open" }],
      };
    });
    await mount("super_admin");
    expect(await screen.findByRole("region", { name: "Ringkasan Eksekutif Sistem" })).toBeInTheDocument();
    for (const name of [
      "Tren Proyek",
      "Severity Temuan Terbuka",
      "Siklus Tahap Proyek",
      "Proyek Paling Berisiko",
      "Mandays Pentester",
      "Komposisi Pengguna",
      "Status Penanganan Temuan",
      "Tenggat Terdekat",
      "Aktivitas Terbaru",
      "Katalog Kerentanan",
      "Pintasan Administrasi",
    ]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    // Report hanya untuk proyek Assessment ke atas (ketiganya), proyek gagal ditandai
    await waitFor(() => expect(api.getReport).toHaveBeenCalledTimes(3));
    const risky = screen.getByRole("region", { name: "Proyek Paling Berisiko" });
    expect(await within(risky).findByText("Proyek Uji")).toBeInTheDocument();
    expect(within(risky).getByText(/1 proyek belum termuat/)).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Mandays Pentester" })).getByText("Budi Santoso")).toBeInTheDocument();
    expect(await within(screen.getByRole("region", { name: "Aktivitas Terbaru" })).findAllByText("Proyek Uji")).not.toHaveLength(0);
    expect(screen.getByRole("link", { name: /Tambah Pengguna/ })).toHaveAttribute("href", "/users");
    expect(screen.getAllByRole("link", { name: /Buat Proyek/ })[0]).toHaveAttribute("href", "/projects/new");
  });
});

describe("stageIndexForStatus", () => {
  it("Scoping..Final Presentation = tahap timeline; Draft belum kickoff; Planning sudah tidak ada", () => {
    expect(stageIndexForStatus("Draft")).toBe(-1);
    expect(stageIndexForStatus("Planning")).toBe(-1);
    expect(stageIndexForStatus("Scoping")).toBe(0);
    expect(stageIndexForStatus("Remediasi")).toBe(4);
    expect(stageIndexForStatus("Final Presentation")).toBe(7);
    expect(stageIndexForStatus("Done")).toBe(8);
    expect(statusBetween("Retesting", "Initial Report", "Done")).toBe(true);
    expect(statusBetween("Analysis", "Initial Report", "Done")).toBe(false);
  });
});
