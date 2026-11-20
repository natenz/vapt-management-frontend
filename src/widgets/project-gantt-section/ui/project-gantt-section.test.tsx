import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { updateProjectStages, type ProjectDetail } from "@/entities/project";
import { ProjectGanttSection } from "./project-gantt-section";

vi.mock("@/entities/project", async (load) => ({ ...await load<typeof import("@/entities/project")>(), updateProjectStages: vi.fn().mockResolvedValue([]) }));
vi.mock("@/shared/ui/gantt", () => ({ Gantt: ({ holidays, items }: { holidays: string[]; items: { barClassName: string }[] }) =>
  <div data-testid="calendar" data-holidays={holidays.join()} data-color={items[0]?.barClassName} /> }));

const project: ProjectDetail = {
  project_id: 9, project_name: "Uji jadwal", client_name: "Klien", pm_id: 1, total_mandays: 10,
  projected_mandays: 10, start_date: "2026-12-01", end_date: "2026-12-31", schedule_holidays: ["2026-12-25"],
  status: { status_process_id: 2, status_name: "Scoping" }, mandays: [], resources: [], assets: [],
  stages: [{ stage_id: 1, project_id: 9, sort_order: 1, stage_name: "Scoping", owner: "Telkom", start_date: "2026-12-01", end_date: "2026-12-10" }],
};

describe("Kalender timeline proyek", () => {
  it("menyimpan libur tambahan bersama stage dan mengembalikan kalender saat Batalkan", async () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    render(<QueryClientProvider client={qc}><ProjectGanttSection project={project} canEdit /></QueryClientProvider>);
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-holidays", "2026-12-25");
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-color", expect.stringContaining("bg-cyan"));
    fireEvent.click(screen.getByText("Hari libur tambahan (1)"));
    fireEvent.change(screen.getByLabelText("Mulai libur"), { target: { value: "2026-12-23" } });
    fireEvent.change(screen.getByLabelText("Sampai (opsional)"), { target: { value: "2026-12-24" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah libur" }));
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-holidays", "2026-12-23,2026-12-24,2026-12-25");
    fireEvent.click(screen.getByRole("button", { name: "Simpan jadwal" }));
    await waitFor(() => expect(updateProjectStages).toHaveBeenCalledWith(9, [expect.objectContaining({ stage_id: 1, start_date: "2026-12-01", end_date: "2026-12-10" })], ["2026-12-23", "2026-12-24", "2026-12-25"]));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["project", 9] }));
    fireEvent.click(screen.getByRole("button", { name: "Batalkan" }));
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-holidays", "2026-12-25");
  });
  it("menampilkan libur tersimpan pada mode baca tanpa pengaturan PM", () => {
    render(<QueryClientProvider client={new QueryClient()}><ProjectGanttSection project={project} /></QueryClientProvider>);
    expect(screen.getByTestId("calendar")).toHaveAttribute("data-holidays", "2026-12-25");
    expect(screen.queryByRole("button", { name: "Tambah libur" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Simpan jadwal" })).not.toBeInTheDocument();
  });
});
