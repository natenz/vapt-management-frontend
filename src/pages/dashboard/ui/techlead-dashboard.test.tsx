import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogVulna } from "@/entities/catalog";
import type { Exposure } from "@/entities/finding";
import type { Project, ProjectDetail, ResourceLoad } from "@/entities/project";
import type { User } from "@/entities/user";
import { TechLeadDashboard } from "./techlead-dashboard";

const mockProjects: Project[] = [
  {
    project_id: 101,
    project_name: "Web Portal SSO Telkom",
    client_name: "Divisi IT",
    total_mandays: 10,
    projected_mandays: 10,
    status: { status_process_id: 4, status_name: "Assessment" },
    start_date: "2026-11-01",
    end_date: "2026-11-30",
    pm_id: 3,
    pm: {
      sys_user_id: 3,
      username: "pm.andi",
      email: "andi@telkom.co.id",
      role_id: 3,
      profile: { user_id: 3, full_name: "Andi Wijaya" },
    },
  },
  {
    project_id: 102,
    project_name: "Aplikasi Mobile MyTelkom",
    client_name: "Divisi Digital",
    total_mandays: 15,
    projected_mandays: 15,
    status: { status_process_id: 7, status_name: "Remediasi" },
    start_date: "2026-10-15",
    end_date: "2026-12-10",
    pm_id: 4,
    pm: {
      sys_user_id: 4,
      username: "pm.sari",
      email: "sari@telkom.co.id",
      role_id: 3,
      profile: { user_id: 4, full_name: "Sari Dewi" },
    },
  },
  {
    project_id: 103,
    project_name: "Audit API Gateway Legacy",
    client_name: "Enterprise",
    total_mandays: 8,
    projected_mandays: 8,
    pm_id: 1,
    status: { status_process_id: 11, status_name: "Done" },
    start_date: "2026-09-01",
    end_date: "2026-10-01",
  },
  {
    project_id: 104,
    project_name: "Template Proyek Baru",
    client_name: "Internal",
    total_mandays: 5,
    projected_mandays: 5,
    pm_id: 1,
    status: { status_process_id: 1, status_name: "Draft" },
    start_date: "2026-11-01",
    end_date: "2026-11-30",
  },
];

const mockUsers: User[] = [
  {
    sys_user_id: 201,
    username: "pentester.budi",
    email: "budi@telkom.co.id",
    role_id: 4,
    role: { role_id: 4, role_name: "pentester" },
    profile: { user_id: 201, full_name: "Budi Santoso", department: "Cyber Security" },
  },
  {
    sys_user_id: 202,
    username: "pentester.citra",
    email: "citra@telkom.co.id",
    role_id: 4,
    role: { role_id: 4, role_name: "pentester" },
    profile: { user_id: 202, full_name: "Citra Lestari", department: "Cyber Security" },
  },
  {
    sys_user_id: 203,
    username: "pentester.dimas",
    email: "dimas@telkom.co.id",
    role_id: 4,
    role: { role_id: 4, role_name: "pentester" },
    profile: { user_id: 203, full_name: "Dimas Anggara", department: "Cyber Security" },
  },
];

const mockLoadMap: Record<number, ResourceLoad> = {
  201: { mandays: 8, projects: [] },
  202: { mandays: 16, projects: [] },
  203: { mandays: 24, projects: [] },
};

const mockCatalogQueue: CatalogVulna[] = [
  {
    vulna_id: 501,
    title: "SQL Injection pada Endpoint Auth",
    severity: "Critical",
    cvss_score: 9.8,
    status: "pending",
    description: "Parameter username tidak disanitasi sebelum dikirim ke query database.",
    remediation_recommendation: "Gunakan parameterized prepared statements.",
    creator: {
      sys_user_id: 201,
      username: "pentester.budi",
      email: "budi@telkom.co.id",
      role_id: 4,
      profile: { user_id: 201, full_name: "Budi Santoso" },
    },
  },
];

// Citra 20 MD dan Dimas 7 MD selama 2 minggu mulai Senin depan; Budi belum terjadwal.
const mockDetails = [
  {
    ...mockProjects[0]!,
    assets: [],
    resources: [],
    stages: [],
    mandays: [
      { mandays_id: 1, asset_id: 1, pentester_id: 202, start_date: "2026-11-23", end_date: "2026-12-06", allocated_mandays: 20 },
      { mandays_id: 2, asset_id: 1, pentester_id: 203, start_date: "2026-11-23", end_date: "2026-12-06", allocated_mandays: 7 },
    ],
  },
] as ProjectDetail[];

const mockExposure: Exposure = {
  total: 5,
  by_severity: { Critical: 1, High: 3, Medium: 1 },
  projects: [
    { project_id: 101, project_name: "Web Portal SSO Telkom", client_name: "Divisi IT", critical: 1, high: 2, open: 4 },
    { project_id: 103, project_name: "Audit API Gateway Legacy", client_name: "Enterprise", critical: 0, high: 1, open: 1 },
  ],
};

function renderDashboard(props: {
  projects?: Project[];
  users?: User[];
  catalogQueue?: CatalogVulna[];
  loadMap?: Record<number, ResourceLoad>;
  isLoading?: boolean;
  exposure?: Exposure | null;
  exposureLoading?: boolean;
  exposureError?: unknown;
  pendingLeaveCount?: number | null;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TechLeadDashboard
          projects={props.projects ?? mockProjects}
          users={props.users ?? mockUsers}
          catalogQueue={props.catalogQueue ?? mockCatalogQueue}
          loadMap={props.loadMap ?? mockLoadMap}
          isLoading={props.isLoading ?? false}
          details={mockDetails}
          approvedCount={12}
          exposure={props.exposure === undefined ? mockExposure : props.exposure}
          exposureLoading={props.exposureLoading ?? false}
          exposureError={props.exposureError}
          pendingLeaveCount={props.pendingLeaveCount === undefined ? 3 : props.pendingLeaveCount}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TechLeadDashboard", () => {
  // Kamis, 19 Nov 2026 — hanya Date yang dipalsukan agar timer RTL tetap jalan
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 19, 9));
  });
  afterEach(() => vi.useRealTimers());

  it("merender 2 SummaryTile operasional eksekutif dengan kalkulasi yang akurat dan CTA catalog", () => {
    renderDashboard();

    const summarySection = screen.getByRole("region", { name: "Ringkasan Operasional Tech Lead" });

    // Proyek Aktif: 2 proyek (difmt menjadi "02") — Draft dan Done tidak masuk
    expect(within(summarySection).getByText("Proyek Berjalan")).toBeInTheDocument();
    expect(within(summarySection).getByText("02")).toBeInTheDocument();

    // Pentester Ditugaskan dan Mandays Tim sudah dihapus dari SummaryTile
    expect(within(summarySection).queryByText("Pentester Ditugaskan")).not.toBeInTheDocument();
    expect(within(summarySection).queryByText("Ketersediaan Pentester")).not.toBeInTheDocument();
    expect(within(summarySection).queryByText("Mandays Tim")).not.toBeInTheDocument();

    // Usulan Katalog dengan Call To Action menuju /catalog
    expect(within(summarySection).getByText("Usulan Catalog")).toBeInTheDocument();
    expect(within(summarySection).getByText("01")).toBeInTheDocument();
    const ctaLink = within(summarySection).getByRole("link", { name: "Tinjau" });
    expect(ctaLink).toHaveAttribute("href", "/catalog");

    // Sub KPI card (keterangan terlambat, sesuai jadwal, dan basis data mutakhir) sudah dihapus
    expect(screen.queryByText(/terlambat/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sesuai jadwal/i)).not.toBeInTheDocument();
    expect(within(summarySection).queryByText(/basis data vulnerability mutakhir/i)).not.toBeInTheDocument();
    expect(within(summarySection).queryByText(/total proyek/i)).not.toBeInTheDocument();
  });

  it("merender tabel proyek berjalan dengan kemajuan dan tenggat tanpa keterangan subjudul", () => {
    renderDashboard();

    const projectSec = screen.getByRole("region", { name: "Proyek Berjalan & Progres" });
    // Keterangan di bawah Proyek Berjalan & Progres sudah dihapus
    expect(within(projectSec).queryByText(/proyek aktif/i)).not.toBeInTheDocument();
    expect(within(projectSec).getByText("Web Portal SSO Telkom")).toBeInTheDocument();
    expect(within(projectSec).getByText(/Divisi IT · PM Andi Wijaya/)).toBeInTheDocument();
    expect(within(projectSec).getAllByText("Assessment").length).toBeGreaterThanOrEqual(1);

    expect(within(projectSec).getByText("Aplikasi Mobile MyTelkom")).toBeInTheDocument();
    expect(within(projectSec).getAllByText("Remediasi").length).toBeGreaterThanOrEqual(1);

    // Aksi Buka semua proyek tanpa panah tetap mengarah ke /projects
    expect(within(projectSec).getByRole("link", { name: "Buka semua proyek" })).toHaveAttribute("href", "/projects");

    // Proyek dengan status Done dan Draft tidak ditampilkan di proyek aktif berjalan
    expect(within(projectSec).queryByText("Audit API Gateway Legacy")).not.toBeInTheDocument();
    expect(within(projectSec).queryByText("Template Proyek Baru")).not.toBeInTheDocument();
  });

  it("kartu penugasan pentester mingguan dan mandays pentester tidak lagi ada di bento dashboard Tech Lead", () => {
    renderDashboard();
    expect(screen.queryByRole("region", { name: "Penugasan Pentester Mingguan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Mandays Pentester" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Perencana Slot Proyek Baru" })).not.toBeInTheDocument();
  });

  it("tile Cuti menunggu mengarah ke antrean cuti di halaman Kalender", () => {
    renderDashboard();
    const summarySection = screen.getByRole("region", { name: "Ringkasan Operasional Tech Lead" });
    expect(within(summarySection).getByText("Cuti Menunggu")).toBeInTheDocument();
    expect(within(summarySection).getByText("03")).toBeInTheDocument();
    expect(within(summarySection).getByRole("link", { name: "Tinjau cuti" })).toHaveAttribute(
      "href",
      "/calendar?tab=cuti&status=pending",
    );
  });

  it("menampilkan exposure temuan terbuka dan proyek paling berisiko dari BE", () => {
    renderDashboard();
    const severity = screen.getByRole("region", { name: "Severity Findings Terbuka" });
    expect(within(severity).getByText("5")).toBeInTheDocument();
    const risky = screen.getByRole("region", { name: "Proyek Paling Berisiko" });
    const links = within(risky).getAllByRole("link");
    expect(links[0]).toHaveTextContent("Web Portal SSO Telkom");
    expect(links[0]).toHaveAttribute("href", "/projects/101/report");
    expect(within(risky).getByText("Audit API Gateway Legacy")).toBeInTheDocument();
    expect(within(risky).getAllByText("Done").length).toBeGreaterThanOrEqual(1);
  });

  it("memberi tahu bila exposure gagal dimuat", () => {
    renderDashboard({ exposure: null, exposureError: new Error("boom") });
    expect(screen.getByText("Exposure vulnerability belum bisa dimuat")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Severity Findings Terbuka" })).not.toBeInTheDocument();
  });

  it("kartu persetujuan usulan vulnerability catalog tidak lagi ada di bento dashboard Tech Lead", () => {
    renderDashboard();
    expect(screen.queryByRole("region", { name: "Persetujuan Usulan Vulnerability Catalog" })).not.toBeInTheDocument();
  });
});
