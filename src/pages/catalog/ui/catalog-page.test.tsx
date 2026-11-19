import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogVulna } from "@/entities/catalog";
import { useSession } from "@/entities/session";

beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  Element.prototype.scrollIntoView ??= () => {};
});

const api = vi.hoisted(() => ({
  listCatalog: vi.fn(),
  createCatalog: vi.fn(),
  reviewCatalog: vi.fn(),
}));
vi.mock("@/entities/catalog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/catalog")>();
  return { ...actual, ...api };
});

const approvedItem: CatalogVulna = {
  vulna_id: 1,
  title: "SQL Injection",
  severity: "Critical",
  cvss_score: 9.8,
  remediation_recommendation: "Gunakan parameterized query",
  status: "approved",
};
const pendingItem: CatalogVulna = {
  vulna_id: 2,
  title: "SSRF Internal",
  severity: "High",
  cvss_score: 8.2,
  remediation_recommendation: "Validasi allowlist URL",
  status: "pending",
  created_by: 4,
  creator: {
    sys_user_id: 4,
    username: "pentester.budi",
    email: "budi@test",
    role_id: 4,
    profile: { user_id: 4, full_name: "Budi Santoso" },
  },
};

async function mount(role: "pentester" | "tech_lead") {
  useSession.setState({
    token: "tok",
    user: {
      sys_user_id: role === "pentester" ? 4 : 2,
      username: role === "pentester" ? "pentester.budi" : "techlead",
      email: "u@test",
      role_id: role === "pentester" ? 4 : 2,
      role: { role_id: role === "pentester" ? 4 : 2, role_name: role },
    },
  });
  const { CatalogPage } = await import("./catalog-page");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listCatalog.mockImplementation(async (q: { status?: string } = {}) => {
    if (q.status === "pending") return [pendingItem];
    if (q.status === "rejected") return [];
    return [approvedItem];
  });
  api.createCatalog.mockResolvedValue(pendingItem);
  api.reviewCatalog.mockResolvedValue({ ...pendingItem, status: "approved" });
});

describe("CatalogPage 2 tabel (Menunggu ACC & Disetujui)", () => {
  it("menampilkan 2 tabel bersamaan: Menunggu ACC di atas dan Disetujui di bawah tanpa sort status", async () => {
    await mount("pentester");

    // Kedua judul tabel ada
    expect(await screen.findByRole("heading", { name: "Menunggu ACC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Katalog Kerentanan Disetujui" })).toBeInTheDocument();

    // Data pada kedua tabel tampil bersamaan
    expect(screen.getByText("SSRF Internal")).toBeInTheDocument();
    expect(screen.getByText("SQL Injection")).toBeInTheDocument();

    // Tombol ajukan ada untuk pentester
    expect(screen.getByRole("button", { name: /Ajukan ke katalog/ })).toBeInTheDocument();

    // Filter status dihilangkan, tetapi filter severity tetap ada
    expect(screen.queryByRole("button", { name: /^Status: / })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter Severity" })).toBeInTheDocument();

    // Kedua tabel mempertahankan sorting kolom Severity
    expect(screen.getAllByRole("button", { name: /^Severity/ })).toHaveLength(2);
  });

  it("tech lead melihat tabel Menunggu ACC dan dapat menekan ACC untuk menyetujui usulan", async () => {
    const u = userEvent.setup();
    await mount("tech_lead");

    expect(await screen.findByRole("heading", { name: "Menunggu ACC" })).toBeInTheDocument();
    const pendingSection = screen.getByRole("region", { name: "Menunggu ACC" });
    expect(within(pendingSection).getByText("SSRF Internal")).toBeInTheDocument();
    expect(within(pendingSection).getByText("Budi Santoso")).toBeInTheDocument();

    const accBtn = within(pendingSection).getByRole("button", { name: "ACC" });
    await u.click(accBtn);
    await waitFor(() => expect(api.reviewCatalog).toHaveBeenCalledWith(2, "approved"));
  });

  it("menyaring kerentanan pada input pencarian di kedua tabel", async () => {
    const u = userEvent.setup();
    await mount("tech_lead");
    expect(await screen.findByText("SQL Injection")).toBeInTheDocument();
    expect(screen.getByText("SSRF Internal")).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", { name: "Cari kerentanan" });
    await u.type(searchInput, "nonexistent");

    expect(screen.queryByText("SQL Injection")).not.toBeInTheDocument();
    expect(screen.queryByText("SSRF Internal")).not.toBeInTheDocument();
    expect(screen.getByText("Tidak ada pengajuan yang cocok")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada kerentanan yang cocok")).toBeInTheDocument();
  });
});
