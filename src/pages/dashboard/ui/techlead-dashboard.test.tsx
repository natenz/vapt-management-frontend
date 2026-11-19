import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as catalogModule from "@/entities/catalog";
import type { CatalogVulna } from "@/entities/catalog";
import type { Project, ProjectDetail, ResourceLoad } from "@/entities/project";
import type { User } from "@/entities/user";
import { TechLeadDashboard } from "./techlead-dashboard";

vi.mock("@/entities/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/catalog")>()),
  reviewCatalog: vi.fn(),
}));

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
  201: { mandays: 8, projects: [] }, // Available (8 MD, remaining 12 MD)
  202: { mandays: 16, projects: [] }, // Busy / Padat (16 MD)
  203: { mandays: 24, projects: [] }, // Overloaded (> 20 MD)
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

// Citra penuh 2 minggu mulai Senin depan, Dimas 70% — Budi bebas.
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

function renderDashboard(props: {
  projects?: Project[];
  users?: User[];
  catalogQueue?: CatalogVulna[];
  loadMap?: Record<number, ResourceLoad>;
  isLoading?: boolean;
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

  it("merender 4 SummaryTile operasional eksekutif dengan kalkulasi yang akurat", () => {
    renderDashboard();

    const summarySection = screen.getByRole("region", { name: "Ringkasan Operasional Tech Lead" });

    // Proyek Aktif: 2 proyek (difmt menjadi "02")
    expect(within(summarySection).getByText("Proyek Berjalan")).toBeInTheDocument();
    expect(within(summarySection).getByText("02")).toBeInTheDocument();

    // Ketersediaan: 1 pentester tersedia (Budi, 8 MD) dan Antrean: 1 usulan (keduanya diformat "01")
    expect(within(summarySection).getByText("Ketersediaan Pentester")).toBeInTheDocument();
    expect(within(summarySection).getAllByText("01")).toHaveLength(2);

    // Total Beban Mandays: 8 + 16 + 24 = 48 MD
    expect(within(summarySection).getByText("Beban Mandays Tim")).toBeInTheDocument();
    expect(within(summarySection).getByText("48")).toBeInTheDocument();

    // Antrean Usulan Katalog
    expect(within(summarySection).getByText("Antrean Usulan Katalog")).toBeInTheDocument();
  });

  it("merender tabel proyek berjalan dengan kemajuan dan tenggat", () => {
    renderDashboard();

    const projectSec = screen.getByRole("region", { name: "Proyek Berjalan & Progres" });
    expect(within(projectSec).getByText("Web Portal SSO Telkom")).toBeInTheDocument();
    expect(within(projectSec).getByText(/Divisi IT · PM Andi Wijaya/)).toBeInTheDocument();
    expect(within(projectSec).getAllByText("Assessment").length).toBeGreaterThanOrEqual(1);

    expect(within(projectSec).getByText("Aplikasi Mobile MyTelkom")).toBeInTheDocument();
    expect(within(projectSec).getAllByText("Remediasi").length).toBeGreaterThanOrEqual(1);

    // Proyek dengan status Done tidak ditampilkan di proyek aktif
    expect(within(projectSec).queryByText("Audit API Gateway Legacy")).not.toBeInTheDocument();
  });

  it("heatmap beban mingguan menandai minggu yang penuh dan menautkan linimasa", () => {
    renderDashboard();

    const heatmap = screen.getByRole("region", { name: "Ketersediaan & Penugasan Personil" });
    const citra = within(heatmap).getByRole("rowheader", { name: "Citra Lestari" }).closest("tr")!;
    // 20 MD / 14 hari kalender → 5 hari kerja = 7,1 MD dari kapasitas 5 MD
    expect(within(citra).getAllByText("143%")).toHaveLength(2);
    expect(within(heatmap).getByRole("rowheader", { name: "Budi Santoso" })).toBeInTheDocument();

    const timelineLink = within(heatmap).getByRole("link", { name: "Cek Benturan Jadwal di Linimasa" });
    expect(timelineLink).toHaveAttribute("href", "/resources?tampilan=timeline");
  });

  it("perencana slot merekomendasikan slot tercepat saat pentester longgar kurang", () => {
    renderDashboard();

    const planner = screen.getByRole("region", { name: "Perencana Slot Proyek Baru" });
    // Default: mulai Senin depan (23 Nov), 14 hari, tim 2 orang
    expect(within(planner).getByLabelText("Tanggal mulai")).toHaveValue("2026-11-23");
    expect(within(planner).getByRole("status")).toHaveTextContent("Hanya 1 pentester longgar, butuh 2.");

    fireEvent.click(within(planner).getByRole("button", { name: "Pakai slot ini" }));
    expect(within(planner).getByLabelText("Tanggal mulai")).toHaveValue("2026-11-30");
    expect(within(planner).getByRole("status")).toHaveTextContent("2 pentester longgar");
    expect(within(planner).getAllByText("Rekomendasi")).toHaveLength(2);
    expect(within(planner).getByRole("link", { name: "Buat proyek dengan jadwal ini" })).toHaveAttribute(
      "href",
      "/projects/new?mulai=2026-11-30&selesai=2026-12-13",
    );
  });

  it("menampilkan usulan katalog kerentanan dan menyetujui saat tombol Setujui ditekan", async () => {
    vi.mocked(catalogModule.reviewCatalog).mockResolvedValueOnce({
      vulna_id: 501,
      title: "SQL Injection pada Endpoint Auth",
      severity: "Critical",
      status: "approved",
    });

    renderDashboard();

    const catalogSec = screen.getByRole("region", {
      name: "Persetujuan Usulan Katalog Kerentanan",
    });
    expect(within(catalogSec).getByText("SQL Injection pada Endpoint Auth")).toBeInTheDocument();
    expect(within(catalogSec).getByText("Budi Santoso")).toBeInTheDocument();

    const approveButton = within(catalogSec).getByRole("button", { name: "Setujui" });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(catalogModule.reviewCatalog).toHaveBeenCalledWith(501, "approved");
    });
  });

  it("dapat membuka dialog tinjau detail usulan kerentanan", () => {
    renderDashboard();

    const catalogSec = screen.getByRole("region", {
      name: "Persetujuan Usulan Katalog Kerentanan",
    });
    const reviewButton = within(catalogSec).getByRole("button", { name: "Tinjau" });
    fireEvent.click(reviewButton);

    // Dialog terbuka dengan deskripsi lengkap
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Parameter username tidak disanitasi sebelum dikirim ke query database."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Gunakan parameterized prepared statements."),
    ).toBeInTheDocument();
  });

  it("menampilkan EmptyState saat tidak ada usulan kerentanan pending", () => {
    renderDashboard({ catalogQueue: [] });

    const catalogSec = screen.getByRole("region", {
      name: "Persetujuan Usulan Katalog Kerentanan",
    });
    expect(
      within(catalogSec).getByText("Tidak ada usulan kerentanan pending"),
    ).toBeInTheDocument();
  });
});
