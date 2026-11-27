import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType, ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamCalendar } from "@/entities/calendar";
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

type Row = { id: string };
// SVAR butuh ukuran nyata; di jsdom cukup render sel tiap baris.
vi.mock("@svar-ui/react-gantt", () => ({
  Gantt: ({ tasks, columns }: { tasks: Row[]; columns: { id: string; cell?: ComponentType<{ row: Row }> }[] }) => (
    <div data-testid="calendar-gantt">
      {tasks.map((t) => (
        <div key={t.id} data-row={t.id}>
          {columns.map((c) => (c.cell ? <c.cell key={c.id} row={t} /> : null))}
        </div>
      ))}
    </div>
  ),
  Willow: ({ children }: { children: ReactNode }) => <>{children}</>,
  locateTask: () => null,
}));
vi.mock("@svar-ui/react-gantt/all.css", () => ({}));

const api = vi.hoisted(() => ({
  getCalendar: vi.fn(),
  listHolidays: vi.fn(),
  createHoliday: vi.fn(),
  deleteHoliday: vi.fn(),
}));
vi.mock("@/entities/calendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/calendar")>()),
  ...api,
}));

const booking = (mandays_id: number, project_id: number, project_name: string) => ({
  mandays_id, project_id, project_name, project_code: `P${project_id}`, asset_name: "Portal",
  start_date: "2026-12-07", end_date: "2026-12-11", allocated_mandays: 5, masked: false, warnings: [],
});
const calendar: TeamCalendar = {
  from: "2026-12-01",
  to: "2026-12-31",
  holidays: [],
  people: [
    { sys_user_id: 5, name: "Budi Santoso", workdays: 22, bookings: [booking(1, 3, "VAPT HRIS")] },
    { sys_user_id: 6, name: "Citra Lestari", workdays: 22, bookings: [booking(2, 4, "VAPT Billing")] },
  ],
};

async function mount(role: string, path = "/calendar") {
  useSession.setState({
    token: "t",
    user: { sys_user_id: 2, username: "u", email: "u@t", role_id: 1, role: { role_id: 1, role_name: role } },
  });
  const { CalendarPage } = await import("./calendar-page");
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const rows = () => [...document.querySelectorAll("[data-row]")].map((r) => r.getAttribute("data-row"));
// Dua penugasan mulai di hari yang sama, jadi urut nama proyek: Billing (4) lalu HRIS (3).

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 2, 9)); // Rabu, 2 Des 2026
    for (const fn of Object.values(api)) fn.mockReset();
    api.getCalendar.mockResolvedValue(calendar);
    api.listHolidays.mockResolvedValue([{ holiday_id: 1, date: "2026-12-25", name: "Libur kantor" }]);
    api.createHoliday.mockResolvedValue({ holiday_id: 2, date: "2026-12-31", name: "Tutup buku", conflicts: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("memuat jadwal bulan berjalan sebagai Gantt harian, tanpa bagian cuti", async () => {
    await mount("tech_lead");
    await waitFor(() => expect(api.getCalendar).toHaveBeenCalledWith({ from: "2026-12-01", to: "2026-12-31" }));
    expect(await screen.findByTestId("calendar-gantt")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Interval snapshot" })).toHaveTextContent("Hari");
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Kalender", "Hari libur"]);
    expect(screen.queryByText(/cuti/i)).not.toBeInTheDocument();
  });

  it("berpindah ke bulan berikutnya memuat rentang bulan itu", async () => {
    const user = userEvent.setup();
    await mount("tech_lead");
    await screen.findByTestId("calendar-gantt");
    await user.click(screen.getByRole("button", { name: "Rentang berikutnya" }));
    await waitFor(() => expect(api.getCalendar).toHaveBeenCalledWith({ from: "2027-01-01", to: "2027-01-31" }));
  });

  it("tombol Hari ini kembali ke bulan berjalan", async () => {
    const user = userEvent.setup();
    await mount("tech_lead");
    await screen.findByTestId("calendar-gantt");
    await user.click(screen.getByRole("button", { name: "Rentang berikutnya" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Rentang data: 1 Jan/ })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Hari ini" }));
    expect(screen.getByRole("button", { name: /Rentang data: 1 Des/ })).toBeInTheDocument();
  });

  it("menyaring menurut pentester dan proyek", async () => {
    const user = userEvent.setup();
    await mount("tech_lead");
    await screen.findByTestId("calendar-gantt");
    expect(rows()).toEqual(["project:4", "project:3"]);

    await user.selectOptions(screen.getByLabelText("Filter pentester"), "6");
    expect(rows()).toEqual(["project:4"]);

    await user.selectOptions(screen.getByLabelText("Filter pentester"), "");
    await user.selectOptions(screen.getByLabelText("Filter proyek"), "3");
    expect(rows()).toEqual(["project:3"]);
  });

  it("pentester tidak punya filter pentester", async () => {
    await mount("pentester");
    await screen.findByTestId("calendar-gantt");
    expect(screen.queryByLabelText("Filter pentester")).not.toBeInTheDocument();
  });

  it("menjelaskan kegagalan memuat", async () => {
    api.getCalendar.mockRejectedValue(new Error("Rentang kalender maksimal 366 hari."));
    await mount("tech_lead");
    expect(await screen.findByText("Rentang kalender maksimal 366 hari.")).toBeInTheDocument();
  });

  it("tech lead mengelola hari libur", async () => {
    const user = userEvent.setup();
    await mount("tech_lead", "/calendar?tab=libur");
    await waitFor(() => expect(api.listHolidays).toHaveBeenCalledWith(2026));
    expect(await screen.findByText("Libur kantor")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Tanggal libur"), "2026-12-31");
    await user.type(screen.getByLabelText("Nama hari libur"), "Tutup buku");
    await user.click(screen.getByRole("button", { name: "Tambah hari libur" }));
    await waitFor(() => expect(api.createHoliday).toHaveBeenCalledWith({ date: "2026-12-31", name: "Tutup buku" }));
    await user.click(screen.getByRole("button", { name: "Hapus Libur kantor" }));
    await waitFor(() => expect(api.deleteHoliday).toHaveBeenCalledWith(1));
  });

  it("PM hanya melihat hari libur", async () => {
    await mount("project_manager", "/calendar?tab=libur");
    expect(await screen.findByText("Libur kantor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tambah hari libur" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hapus/ })).not.toBeInTheDocument();
  });
});
