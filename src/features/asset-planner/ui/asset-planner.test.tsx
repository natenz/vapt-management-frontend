import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "@/entities/project";

const api = vi.hoisted(() => ({
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
  deleteAsset: vi.fn(),
  createMandays: vi.fn(),
  updateMandays: vi.fn(),
  deleteMandays: vi.fn(),
}));
vi.mock("@/entities/project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/project")>();
  return {
    ...actual,
    ...api,
  };
});

const user = (id: number, name: string) => ({
  user_id: id,
  full_name: name,
  sys_user_id: id,
  sys_user: {
    sys_user_id: id,
    username: name.toLowerCase(),
    email: "",
    role_id: 4,
    role: { role_id: 4, role_name: "pentester" },
    profile: { user_id: id, full_name: name },
  },
});
const project = {
  project_id: 10,
  project_name: "tes",
  client_name: "x",
  total_mandays: 0,
  pm_id: 4,
  start_date: "2026-11-16T00:00:00Z",
  end_date: "2026-12-11T00:00:00Z",
  status: { status_process_id: 2, status_name: "Planning" },
  assets: [],
  mandays: [],
  resources: [
    { resource_id: 1, user_id: 5, user: user(5, "Budi") },
    { resource_id: 2, user_id: 7, user: user(7, "Dimas") },
  ],
} as unknown as ProjectDetail;

async function mount(p = project, canAssign = true) {
  const { AssetPlanner } = await import("./asset-planner");
  const ui = (proj: ProjectDetail) => (
    <QueryClientProvider client={client}>
      <AssetPlanner project={proj} canAssign={canAssign} />
    </QueryClientProvider>
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const r = render(ui(p));
  return { ...r, update: (next: ProjectDetail) => r.rerender(ui(next)) };
}

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.createAsset.mockResolvedValue({ assets_id: 99 });
  api.createMandays.mockResolvedValue({});
});

describe("AssetPlanner", () => {
  it("alur spesifikasi: aset mobile 20 md muncul sebagai draf, 2 pentester => 10 md masing-masing, BE baru disentuh saat Simpan", async () => {
    const u = userEvent.setup();
    await mount();
    await u.click(screen.getByRole("button", { name: /Tambah aset/ }));
    await u.type(screen.getByLabelText("Nama aset"), "Mobile App");
    await u.selectOptions(screen.getByLabelText("Tipe aset"), "mobile");
    await u.type(screen.getByLabelText("Mandays aset"), "20");

    expect(screen.getByText("draf")).toBeInTheDocument();
    expect(screen.getByText(/Ada perubahan yang belum disimpan/)).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: /Tambah pentester/ }));
    expect(screen.getByLabelText("Mandays pentester 1")).toHaveAttribute("placeholder", "20");
    await u.click(screen.getByRole("button", { name: /Tambah pentester/ }));
    expect(screen.getByLabelText("Mandays pentester 1")).toHaveAttribute("placeholder", "10");
    expect(screen.getByLabelText("Mandays pentester 2")).toHaveAttribute("placeholder", "10");
    expect(screen.getByLabelText("Mandays pentester 1")).toHaveValue(null);

    await u.selectOptions(screen.getByLabelText(/Pentester 1 untuk/), "Budi");
    await u.selectOptions(screen.getByLabelText(/Pentester 2 untuk/), "Dimas");
    expect(api.createAsset).not.toHaveBeenCalled();

    await u.click(screen.getByRole("button", { name: "Simpan ke server" }));
    await waitFor(() => expect(api.createMandays).toHaveBeenCalledTimes(2));
    expect(api.createAsset).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ asset_name: "Mobile App", asset_type: "mobile", mandays: 20 }),
    );
    expect(api.createMandays).toHaveBeenNthCalledWith(
      1,
      10,
      expect.objectContaining({
        asset_id: 99,
        pentester_id: 5,
        allocated_mandays: 10,
        start_date: "2026-11-16",
        end_date: "2026-12-11",
      }),
    );
    expect(api.createMandays).toHaveBeenNthCalledWith(2, 10, expect.objectContaining({ pentester_id: 7, allocated_mandays: 10 }));
  });

  it("PM mengatur manual: 11 md => 5 + 6 diterima; 5 + 7 ditolak (melebihi aset) tanpa request ke BE", async () => {
    const u = userEvent.setup();
    await mount();
    await u.click(screen.getByRole("button", { name: /Tambah aset/ }));
    await u.type(screen.getByLabelText("Nama aset"), "Web Portal");
    await u.type(screen.getByLabelText("Mandays aset"), "11");
    await u.click(screen.getByRole("button", { name: /Tambah pentester/ }));
    await u.click(screen.getByRole("button", { name: /Tambah pentester/ }));
    expect(screen.getByLabelText("Mandays pentester 1")).toHaveAttribute("placeholder", "5.5");
    await u.selectOptions(screen.getByLabelText(/Pentester 1 untuk/), "Budi");
    await u.selectOptions(screen.getByLabelText(/Pentester 2 untuk/), "Dimas");

    await u.type(screen.getByLabelText("Mandays pentester 1"), "5");
    await u.type(screen.getByLabelText("Mandays pentester 2"), "7");
    expect(screen.getByText(/Dialokasikan 12 dari 11 md · lebih 1 md/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Simpan ke server" }));
    expect(await screen.findByText(/Total mandays pentester \(12 md\) melebihi mandays aset \(11 md\)/)).toBeInTheDocument();
    expect(api.createAsset).not.toHaveBeenCalled();

    await u.clear(screen.getByLabelText("Mandays pentester 2"));
    await u.type(screen.getByLabelText("Mandays pentester 2"), "6");
    expect(screen.getByText(/Dialokasikan 11 dari 11 md/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Simpan ke server" }));
    await waitFor(() => expect(api.createMandays).toHaveBeenCalledTimes(2));
    expect(api.createMandays).toHaveBeenNthCalledWith(1, 10, expect.objectContaining({ pentester_id: 5, allocated_mandays: 5 }));
    expect(api.createMandays).toHaveBeenNthCalledWith(2, 10, expect.objectContaining({ pentester_id: 7, allocated_mandays: 6 }));
  });

  it("isian tidak valid: pesan Indonesia, tidak ada request ke BE", async () => {
    const u = userEvent.setup();
    await mount();
    await u.click(screen.getByRole("button", { name: /Tambah aset/ }));
    await u.type(screen.getByLabelText("IP address"), "2121");
    await u.click(screen.getByRole("button", { name: "Simpan ke server" }));
    const alert = await screen.findByText("Periksa isian berikut");
    const box = alert.closest("[role=alert]") ?? alert.parentElement!;
    expect(within(box as HTMLElement).getByText(/Nama aset wajib diisi/)).toBeInTheDocument();
    expect(within(box as HTMLElement).getByText(/Mandays aset harus lebih dari 0/)).toBeInTheDocument();
    expect(within(box as HTMLElement).getByText(/IP address tidak valid/)).toBeInTheDocument();
    expect(api.createAsset).not.toHaveBeenCalled();
  });

  it("Batalkan perubahan membuang draf tanpa menyentuh BE", async () => {
    const u = userEvent.setup();
    await mount();
    await u.click(screen.getByRole("button", { name: /Tambah aset/ }));
    await u.click(screen.getByRole("button", { name: "Batalkan perubahan" }));
    expect(screen.queryByLabelText("Nama aset")).toBeNull();
    expect(Object.values(api).every((f) => f.mock.calls.length === 0)).toBe(true);
  });

  it("tanpa hak assign (mis. super admin) hanya ada tabel aset, tanpa baris assign pentester", async () => {
    const u = userEvent.setup();
    await mount(project, false);
    await u.click(screen.getByRole("button", { name: /Tambah aset/ }));
    expect(screen.queryByRole("button", { name: /Tambah pentester/ })).toBeNull();
  });

  it("aset tersimpan dihapus: ditandai dulu, baru dihapus di BE saat Simpan", async () => {
    const u = userEvent.setup();
    const p = {
      ...project,
      assets: [{ assets_id: 1, asset_name: "Lama", asset_type: "web", mandays: 5, project_id: 10 }],
      mandays: [],
    } as unknown as ProjectDetail;
    await mount(p);
    await u.click(screen.getByRole("button", { name: "Hapus aset Lama" }));
    expect(api.deleteAsset).not.toHaveBeenCalled();
    expect(screen.getByText(/akan dihapus saat disimpan/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Simpan ke server" }));
    await waitFor(() => expect(api.deleteAsset).toHaveBeenCalledWith(1));
  });

  it("server berubah SAAT user mengedit: draf tidak ditimpa, Simpan dikunci, ada peringatan; tanpa suntingan data server langsung diikuti", async () => {
    const u = userEvent.setup();
    const m = await mount();
    const withAsset = (name: string) =>
      ({
        ...project,
        assets: [{ assets_id: 1, asset_name: name, asset_type: "web", mandays: 5, project_id: 10 }],
      }) as unknown as ProjectDetail;

    m.update(withAsset("Dari Server"));
    expect(await screen.findByDisplayValue("Dari Server")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: /Tambah aset/ }));
    await u.type(screen.getAllByLabelText("Nama aset")[1]!, "Draf Saya");
    m.update(withAsset("Diubah Orang Lain"));
    expect(await screen.findByText(/Data proyek di server berubah/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Draf Saya")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Diubah Orang Lain")).toBeNull();
    expect(screen.getByRole("button", { name: "Simpan ke server" })).toBeDisabled();

    await u.click(screen.getByRole("button", { name: /Buang draf dan muat ulang/ }));
    expect(await screen.findByDisplayValue("Diubah Orang Lain")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Draf Saya")).toBeNull();
  });

  it("ada draf belum disimpan => beforeunload aktif; tanpa draf => tidak", async () => {
    const u = userEvent.setup();
    const add = vi.spyOn(window, "addEventListener");
    await mount();
    expect(add.mock.calls.filter((c) => c[0] === "beforeunload")).toHaveLength(0);
    await u.click(screen.getByRole("button", { name: /Tambah aset/ }));
    expect(add.mock.calls.filter((c) => c[0] === "beforeunload")).toHaveLength(1);
    add.mockRestore();
  });
});
