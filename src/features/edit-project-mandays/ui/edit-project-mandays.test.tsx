import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { updateProjectMandays, type ProjectDetail } from "@/entities/project";
import { useSession } from "@/entities/session";
import { EditProjectMandays } from "./edit-project-mandays";

vi.mock("@/entities/project", async (load) => ({ ...await load<typeof import("@/entities/project")>(), updateProjectMandays: vi.fn() }));
const project: ProjectDetail = {
  project_id: 7, project_name: "Audit jaringan", client_name: "Klien", pm_id: 3,
  total_mandays: 30, projected_mandays: 50,
  status: { status_process_id: 10, status_name: "Done" }, resources: [], assets: [], mandays: [], stages: [],
};
function mount(role = "project_manager", id = 3) {
  useSession.setState({ user: { sys_user_id: id, username: "qa", email: "qa@example.test", role_id: 3, role: { role_id: 3, role_name: role } } });
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(["project", 7], project);
  render(<QueryClientProvider client={qc}><EditProjectMandays project={project} /></QueryClientProvider>);
  return qc;
}
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); useSession.getState().clear(); });

describe("Edit mandays proyek", () => {
  it("PM mengubah jatah di Done dan memperbarui cache tanpa mengganti total asset", async () => {
    vi.mocked(updateProjectMandays).mockResolvedValue({ ...project, projected_mandays: 75.5 });
    const qc = mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit mandays proyek" }));
    expect(screen.getByLabelText("Mandays proyek")).toHaveValue(50);
    fireEvent.change(screen.getByLabelText("Mandays proyek"), { target: { value: "75.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan mandays" }));
    await waitFor(() => expect(updateProjectMandays).toHaveBeenCalledWith(7, 75.5));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(qc.getQueryData(["project", 7])).toEqual(expect.objectContaining({ projected_mandays: 75.5, total_mandays: 30 }));
  });
  it.each(["", "20", "40.123"])("menolak isian %s sebelum mengirim perubahan", (value) => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit mandays proyek" }));
    fireEvent.change(screen.getByLabelText("Mandays proyek"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan mandays" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(/Isi mandays|Mandays proyek minimal/);
    expect(updateProjectMandays).not.toHaveBeenCalled();
  });
  it.each(["pentester", "technical_writer", "tech_lead", "super_admin"])("%s tidak mendapat kontrol edit PM", (role) => {
    mount(role);
    expect(screen.queryByRole("button", { name: "Edit mandays proyek" })).not.toBeInTheDocument();
  });
  it("PM lain tidak mendapat kontrol edit", () => {
    mount("project_manager", 4);
    expect(screen.queryByRole("button", { name: "Edit mandays proyek" })).not.toBeInTheDocument();
  });
  it("mempertahankan form dan nilai isian ketika server menolak", async () => {
    vi.mocked(updateProjectMandays).mockRejectedValue(new Error("Akses ditolak"));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Edit mandays proyek" }));
    fireEvent.change(screen.getByLabelText("Mandays proyek"), { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan mandays" }));
    expect(await screen.findByText("Akses ditolak")).toBeInTheDocument();
    expect(screen.getByLabelText("Mandays proyek")).toHaveValue(70);
  });
});
