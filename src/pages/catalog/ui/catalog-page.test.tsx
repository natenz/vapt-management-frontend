import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
      <CatalogPage />
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

describe("CatalogPage approval", () => {
  it("pentester melihat tombol Ajukan ke katalog dan tab Pengajuan saya (Menunggu ACC)", async () => {
    const u = userEvent.setup();
    await mount("pentester");
    expect(await screen.findByText("SQL Injection")).toBeInTheDocument();
    expect(screen.queryByText("SSRF Internal")).toBeNull();

    expect(screen.getByRole("button", { name: /Ajukan ke katalog/ })).toBeInTheDocument();
    await u.click(screen.getByRole("tab", { name: /Pengajuan saya/ }));
    expect(await screen.findByText("SSRF Internal")).toBeInTheDocument();
    expect(screen.getByText("Menunggu ACC")).toBeInTheDocument();
  });

  it("tech lead dapat melihat tab Menunggu ACC dan menekan ACC", async () => {
    const u = userEvent.setup();
    await mount("tech_lead");
    expect(await screen.findByText("SQL Injection")).toBeInTheDocument();

    await u.click(screen.getByRole("tab", { name: /Menunggu ACC/ }));
    expect(await screen.findByText("SSRF Internal")).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "ACC" }));
    await waitFor(() => expect(api.reviewCatalog).toHaveBeenCalledWith(2, "approved"));
  });
});
