import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "@/entities/project";
import { useSession } from "@/entities/session";
import { FindingsPanel } from "./findings-panel";

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:photo-test");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  useSession.getState().clear();
});

function renderPanel(status: string, role = "pentester", assetType = "web") {
  useSession.setState({
    user: {
      sys_user_id: 5,
      username: "pentester.budi",
      email: "budi@example.com",
      role_id: 1,
      role: { role_id: 1, role_name: role },
    },
  });
  const project: ProjectDetail = {
    project_id: 42,
    project_name: "Portal pengujian",
    client_name: "Telkom",
    total_mandays: 10,
    projected_mandays: 10,
    pm_id: 7,
    status: { status_process_id: 1, status_name: status },
    assets: [{ assets_id: 8, asset_name: "API pengujian", asset_type: assetType, ip_address: "192.0.2.10", mandays: 10, project_id: 42 }],
    mandays: [{ mandays_id: 1, asset_id: 8, pentester_id: 5, allocated_mandays: 10 }],
    resources: [],
    stages: [],
  };
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["findings", 42], []);
  client.setQueryData(["catalog", "approved"], []);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FindingsPanel project={project} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe("Tambah finding", () => {
  it.each(["Draft", "Scoping", "Assessment", "Analysis", "Initial Report", "Remediasi", "Retesting", "Final Report Drafting", "Final Presentation", "Done"])(
    "pentester bisa membuka form dari panel kosong saat %s",
    (status) => {
      renderPanel(status);
      expect(screen.getByText("Belum ada findings tercatat.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Tambah finding" })).toBeInTheDocument();
    },
  );

  it.each(["project_manager", "technical_writer"])("%s tidak mendapat tombol pencatatan", (role) => {
    renderPanel("Assessment", role);
    expect(screen.queryByRole("button", { name: "Tambah finding" })).not.toBeInTheDocument();
  });

  it("super admin tetap bisa mencatat findings", () => {
    renderPanel("Final Report Drafting", "super_admin");
    expect(screen.getByRole("button", { name: "Tambah finding" })).toBeInTheDocument();
  });
});

vi.mock("@/entities/finding", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/entities/finding")>(),
  createFinding: vi.fn(),
  updateFinding: vi.fn(),
  uploadEvidence: vi.fn(),
  listFindings: vi.fn().mockResolvedValue([]),
}));

it("membuka modal, menyimpan, lalu menutup modal dan memperbarui daftar findings", async () => {
  const { createFinding } = await import("@/entities/finding");
  vi.mocked(createFinding).mockResolvedValue({} as Awaited<ReturnType<typeof createFinding>>);
  const client = renderPanel("Analysis");
  const invalidate = vi.spyOn(client, "invalidateQueries");
  fireEvent.click(screen.getByRole("button", { name: "Tambah finding" }));
  const modal = screen.getByRole("dialog", { name: "Tambah finding" });
  fireEvent.change(within(modal).getByLabelText("Asset"), { target: { value: "8" } });
  fireEvent.change(within(modal).getByLabelText("Judul finding"), { target: { value: "SQL injection" } });
  fireEvent.change(within(modal).getByLabelText("Severity"), { target: { value: "High" } });
  fireEvent.click(within(modal).getByRole("button", { name: "Simpan finding" }));
  await waitFor(() => expect(createFinding).toHaveBeenCalledWith(42, expect.objectContaining({ asset_id: 8, custom_title: "SQL injection", severity: "High" })));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["findings", 42] });
});

it("Batal menutup modal tanpa menyimpan dan mengembalikan fokus", async () => {
  renderPanel("Analysis");
  const trigger = screen.getByRole("button", { name: "Tambah finding" });
  trigger.focus();
  fireEvent.click(trigger);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Batal" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
});

it("memisahkan category dari judul finding dan mengirim severity serta CVSS hasil edit termasuk nol", async () => {
  const { createFinding } = await import("@/entities/finding");
  vi.mocked(createFinding).mockResolvedValue({ vulna_id: 123 } as Awaited<ReturnType<typeof createFinding>>);
  const client = renderPanel("Analysis");
  client.setQueryData(["catalog", "approved"], [{ vulna_id: 9, title: "XSS catalog", severity: "High", cvss_score: 8.1, status: "approved" }]);
  fireEvent.click(screen.getByRole("button", { name: "Tambah finding" }));
  fireEvent.change(screen.getByLabelText("Asset"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "9" } });
  expect(screen.getByLabelText("Judul finding")).toHaveValue("");
  fireEvent.click(screen.getByRole("button", { name: "Simpan finding" }));
  expect(await screen.findByText("Isi judul finding")).toBeInTheDocument();
  expect(createFinding).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Judul finding"), { target: { value: "XSS pada halaman profil" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "9" } });
  expect(screen.getByLabelText("Judul finding")).toHaveValue("XSS pada halaman profil");
  expect(screen.getByLabelText("Severity")).toHaveValue("High");
  expect(screen.getByLabelText("CVSS score")).toHaveValue(8.1);
  fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "Low" } });
  fireEvent.change(screen.getByLabelText("CVSS score"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Simpan finding" }));
  await waitFor(() => expect(createFinding).toHaveBeenCalledWith(42, expect.objectContaining({ catalog_vulna_id: 9, custom_title: "XSS pada halaman profil", severity: "Low", cvss_score: 0 })));
});

it.each([9, undefined])("menyimpan category saat edit dengan judul tetap terpisah (category awal %s)", async (categoryId) => {
  const { updateFinding } = await import("@/entities/finding");
  vi.mocked(updateFinding).mockResolvedValue({} as Awaited<ReturnType<typeof updateFinding>>);
  const client = renderPanel("Analysis");
  client.setQueryData(["catalog", "approved"], [
    { vulna_id: 9, title: "SQL Injection", severity: "High", status: "approved" },
    { vulna_id: 10, title: "Broken Access Control", severity: "High", status: "approved" },
    { vulna_id: 11, title: "Category belum disetujui", severity: "Low", status: "pending" },
  ]);
  client.setQueryData(["findings", 42], [{
    vulna_id: 123, project_id: 42, asset_id: 8, pentester_id: 5,
    catalog_vulna_id: categoryId, finding_code: "SCP-002", custom_title: "Tentang SQL",
    severity: "High", cvss_score: 8.1, endpoint: "api/category", status: "open",
  }]);
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Category")).toHaveValue(categoryId ? String(categoryId) : "");
  expect(screen.queryByRole("option", { name: /Category belum disetujui/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "10" } });
  expect(screen.getByLabelText("Judul finding")).toHaveValue("Tentang SQL");
  expect(screen.getByLabelText("CVSS score")).toHaveValue(8.1);
  fireEvent.click(screen.getByRole("button", { name: /^Simpan$/ }));
  await waitFor(() => expect(updateFinding).toHaveBeenCalledWith(123, expect.objectContaining({
    catalog_vulna_id: 10, custom_title: "Tentang SQL", finding_code: undefined, cvss_score: 8.1,
  })));
  await waitFor(() => expect(screen.queryByLabelText("Category")).not.toBeInTheDocument());
});

it("mencatat seluruh detail Network/Infra, status, dan screenshot dengan validasi IP dan alasan penutupan", async () => {
  const { createFinding, uploadEvidence } = await import("@/entities/finding");
  vi.mocked(createFinding).mockResolvedValue({ vulna_id: 123 } as Awaited<ReturnType<typeof createFinding>>);
  vi.mocked(uploadEvidence).mockResolvedValue({} as Awaited<ReturnType<typeof uploadEvidence>>);
  renderPanel("Analysis", "pentester", "network");
  fireEvent.click(screen.getByRole("button", { name: "Tambah finding" }));
  fireEvent.change(screen.getByLabelText("Asset"), { target: { value: "8" } });
  expect(screen.getByLabelText("Nama Perangkat")).toHaveValue("API pengujian");
  expect(screen.getByLabelText("IP")).toHaveValue("192.0.2.10");
  expect(screen.getByLabelText("Findings Code")).toHaveAttribute("readonly");
  for (const [label, value] of [
    ["Vulnerability Name", "Layanan perangkat tidak aman"],
    ["Nama Perangkat", "Router Cabang"], ["Skenario Pengujian", "Uji konfigurasi jaringan"],
    ["Description", "Layanan lama terbuka"], ["Impact", "Akses informasi perangkat"],
    ["Recommendation", "Batasi layanan"], ["Referensi", "https://example.test/advisory"],
    ["CWE", "CWE-200"], ["Note Pentester", "Dikonfirmasi saat pengujian"], ["CVSS", "8.1"], ["Severity", "High"],
  ]) fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.change(screen.getByLabelText("Status Pentest"), { target: { value: "closed_with_note" } });
  fireEvent.change(screen.getByLabelText("IP"), { target: { value: "bukan-ip" } });
  fireEvent.click(screen.getByRole("button", { name: "Simpan finding" }));
  expect(await screen.findByText("Isi alamat IPv4 atau IPv6 yang valid")).toBeInTheDocument();
  expect(screen.getByText("Isi alasan finding ditutup dengan catatan")).toBeInTheDocument();
  expect(createFinding).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("IP"), { target: { value: "2001:db8::1" } });
  fireEvent.change(screen.getByLabelText("Alasan penutupan"), { target: { value: "Risiko diterima klien" } });
  const file = new File(["photo"], "bukti-network.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Screenshot / Evidence"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Simpan finding" }));
  await waitFor(() => expect(createFinding).toHaveBeenCalledWith(42, expect.objectContaining({
    finding_code: undefined, custom_title: "Layanan perangkat tidak aman", device_name: "Router Cabang",
    ip_address: "2001:db8::1", test_scenario: "Uji konfigurasi jaringan", description: "Layanan lama terbuka",
    impact: "Akses informasi perangkat", recommendation: "Batasi layanan", references: "https://example.test/advisory",
    cwe: "CWE-200", pentester_note: "Dikonfirmasi saat pengujian", status: "closed_with_note", status_note: "Risiko diterima klien", cvss_score: 8.1,
  })));
  await waitFor(() => expect(uploadEvidence).toHaveBeenCalledWith(123, file));
});

it("tetap bisa mencatat network di Draft dengan status awal Terbuka", async () => {
  const { createFinding } = await import("@/entities/finding");
  vi.mocked(createFinding).mockResolvedValue({ vulna_id: 123 } as Awaited<ReturnType<typeof createFinding>>);
  renderPanel("Draft", "pentester", "network");
  fireEvent.click(screen.getByRole("button", { name: "Tambah finding" }));
  fireEvent.change(screen.getByLabelText("Asset"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Vulnerability Name"), { target: { value: "Temuan awal" } });
  fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "Low" } });
  fireEvent.click(screen.getByRole("button", { name: "Simpan finding" }));
  await waitFor(() => expect(createFinding).toHaveBeenCalledWith(42, expect.objectContaining({ status: "open", device_name: "API pengujian" })));
});

it("menyunting detail network tanpa menimpa category atau alasan penutupan", async () => {
  const { updateFinding } = await import("@/entities/finding");
  vi.mocked(updateFinding).mockResolvedValue({} as Awaited<ReturnType<typeof updateFinding>>);
  const client = renderPanel("Analysis", "pentester", "network");
  client.setQueryData(["findings", 42], [{
    vulna_id: 123, project_id: 42, asset_id: 8, pentester_id: 5,
    catalog_vulna_id: 9, finding_code: "NET-001", custom_title: "Perangkat jaringan",
    severity: "High", cvss_score: 8.1, status: "open",
    device_name: "Router", ip_address: "192.0.2.10", description: "Data lama",
  }]);
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Description")).toHaveValue("Data lama");
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Impact"), { target: { value: "Dampak hasil uji ulang" } });
  fireEvent.change(screen.getByLabelText("Status Pentest"), { target: { value: "closed" } });
  fireEvent.click(screen.getByRole("button", { name: /^Simpan$/ }));
  await waitFor(() => expect(updateFinding).toHaveBeenCalledWith(123, expect.objectContaining({
    description: "", impact: "Dampak hasil uji ulang", status: "closed", catalog_vulna_id: undefined,
    device_name: "Router", ip_address: "192.0.2.10",
  })));
});

it.each(["pentester", "tech_lead", "super_admin"])("%s tidak dapat mengubah kode meskipun nilai input dimanipulasi", async (role) => {
  const { updateFinding } = await import("@/entities/finding");
  vi.mocked(updateFinding).mockResolvedValue({} as Awaited<ReturnType<typeof updateFinding>>);
  const client = renderPanel("Analysis", role);
  client.setQueryData(["findings", 42], [{
    vulna_id: 123, project_id: 42, asset_id: 8, pentester_id: 5,
    finding_code: "VLN-42-001", custom_title: "Temuan uji", severity: "High", status: "open",
  }]);
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Kode finding")).toHaveAttribute("readonly");
  fireEvent.change(screen.getByLabelText("Kode finding"), { target: { value: "MANUAL-001" } });
  fireEvent.change(screen.getByLabelText("Judul finding"), { target: { value: "Judul diperbarui" } });
  fireEvent.click(screen.getByRole("button", { name: /^Simpan$/ }));
  await waitFor(() => expect(updateFinding).toHaveBeenCalledWith(123, expect.objectContaining({ finding_code: undefined, custom_title: "Judul diperbarui" })));
});

it("Technical Writer dapat mengganti kode finding", async () => {
  const { updateFinding } = await import("@/entities/finding");
  vi.mocked(updateFinding).mockResolvedValue({} as Awaited<ReturnType<typeof updateFinding>>);
  const client = renderPanel("Done", "technical_writer", "network");
  client.setQueryData(["findings", 42], [{
    vulna_id: 123, project_id: 42, asset_id: 8, pentester_id: 5,
    finding_code: "VLN-42-001", custom_title: "Temuan jaringan", severity: "High", status: "open",
  }]);
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Findings Code")).not.toHaveAttribute("readonly");
  fireEvent.change(screen.getByLabelText("Findings Code"), { target: { value: "NET-001" } });
  fireEvent.click(screen.getByRole("button", { name: /^Simpan$/ }));
  await waitFor(() => expect(updateFinding).toHaveBeenCalledWith(123, expect.objectContaining({ finding_code: "NET-001", custom_title: "Temuan jaringan" })));
});

it("mengunggah foto dan retry kegagalan tanpa membuat findings ganda", async () => {
  const { createFinding, uploadEvidence } = await import("@/entities/finding");
  vi.mocked(createFinding).mockResolvedValue({ vulna_id: 123 } as Awaited<ReturnType<typeof createFinding>>);
  vi.mocked(uploadEvidence).mockRejectedValueOnce(new Error("Unggah gagal")).mockResolvedValueOnce({} as Awaited<ReturnType<typeof uploadEvidence>>);
  renderPanel("Analysis");
  fireEvent.click(screen.getByRole("button", { name: "Tambah finding" }));
  fireEvent.change(screen.getByLabelText("Asset"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Judul finding"), { target: { value: "SQL injection" } });
  fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "High" } });
  const file = new File(["photo"], "bukti.png", { type: "image/png" });
  fireEvent.change(screen.getByLabelText("Foto evidence"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Simpan finding" }));
  expect(await screen.findByText("Unggah gagal")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Coba unggah lagi" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(createFinding).toHaveBeenCalledTimes(1);
  expect(uploadEvidence).toHaveBeenCalledTimes(2);
  expect(uploadEvidence).toHaveBeenLastCalledWith(123, file);
});
