import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Leave } from "@/entities/leave";
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
  listLeaves: vi.fn(),
  createLeave: vi.fn(),
  updateLeave: vi.fn(),
  deleteLeave: vi.fn(),
  reviewLeave: vi.fn(),
  listHolidays: vi.fn(),
  createHoliday: vi.fn(),
  deleteHoliday: vi.fn(),
  getCalendar: vi.fn(),
  listUsers: vi.fn(),
}));
vi.mock("@/entities/leave", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/entities/leave")>()), ...api }));
vi.mock("@/entities/calendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/calendar")>()),
  getCalendar: api.getCalendar,
}));
vi.mock("@/entities/user", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/user")>()),
  listUsers: api.listUsers,
}));

const pending: Leave = {
  leave_id: 7, sys_user_id: 5, user_name: "Budi Santoso", start_date: "2026-12-21", end_date: "2026-12-22", workdays: 2,
  reason: "Acara keluarga", status: "pending", review_note: "", created_by: 5,
  conflicts: [{ mandays_id: 1, project_id: 3, project_name: "VAPT HRIS", asset_name: "Portal", start_date: "2026-12-21", end_date: "2026-12-25" }],
};

async function mount(role: string, path = "/calendar", sysUserId = 5) {
  useSession.setState({
    token: "t",
    user: { sys_user_id: sysUserId, username: "u", email: "u@t", role_id: 1, role: { role_id: 1, role_name: role } },
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

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 2, 9)); // Rabu, 2 Des 2026
    for (const fn of Object.values(api)) fn.mockReset();
    api.getCalendar.mockResolvedValue({ from: "2026-11-30", to: "2027-01-03", holidays: [], people: [] });
    api.listLeaves.mockResolvedValue([pending]);
    api.listHolidays.mockResolvedValue([{ holiday_id: 1, date: "2026-12-25", name: "Libur kantor" }]);
    api.listUsers.mockResolvedValue([
      { sys_user_id: 5, username: "pentester.budi", email: "b@t", role_id: 4, profile: { user_id: 5, full_name: "Budi Santoso" } },
    ]);
    api.createLeave.mockImplementation(async (body) => ({ ...pending, ...body, leave_id: 9, conflicts: [] }));
    api.reviewLeave.mockResolvedValue({ ...pending, status: "approved" });
    api.createHoliday.mockResolvedValue({ holiday_id: 2, date: "2026-12-31", name: "Tutup buku", conflicts: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("tab Kalender memuat jadwal bulan berjalan", async () => {
    await mount("pentester");
    await waitFor(() => expect(api.getCalendar).toHaveBeenCalledWith({ from: "2026-11-30", to: "2027-01-03" }));
    expect(screen.getByText("Desember 2026")).toBeInTheDocument();
    expect(screen.queryByLabelText("Filter pentester")).not.toBeInTheDocument();
  });

  it("pentester mengajukan cuti untuk dirinya sendiri", async () => {
    const user = userEvent.setup();
    await mount("pentester", "/calendar?tab=cuti");
    const table = await screen.findByRole("table", { name: "Daftar cuti" });
    expect(within(table).getByText("Acara keluarga")).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Batalkan cuti Budi Santoso" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ajukan cuti" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText("Pentester")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Tanggal mulai"), "2026-12-28");
    await user.type(within(dialog).getByLabelText("Tanggal selesai"), "2026-12-29");
    await user.type(within(dialog).getByLabelText("Alasan"), "Liburan");
    await user.click(within(dialog).getByRole("button", { name: "Kirim pengajuan" }));
    await waitFor(() =>
      expect(api.createLeave).toHaveBeenCalledWith({ start_date: "2026-12-28", end_date: "2026-12-29", reason: "Liburan" }),
    );
  });

  it("tech lead menyetujui, menolak dengan alasan, dan mencatat cuti untuk pentester", async () => {
    const user = userEvent.setup();
    await mount("tech_lead", "/calendar?tab=cuti", 2);
    await waitFor(() => expect(api.listLeaves).toHaveBeenCalledWith({ status: "pending" }));
    const table = await screen.findByRole("table", { name: "Daftar cuti" });
    expect(within(table).getByText("Bentrok 1 penugasan")).toBeInTheDocument();

    await user.click(within(table).getByRole("button", { name: "Setujui cuti Budi Santoso" }));
    await waitFor(() => expect(api.reviewLeave).toHaveBeenCalledWith(7, "approved", undefined));

    await user.click(within(table).getByRole("button", { name: "Tolak cuti Budi Santoso" }));
    const reject = await screen.findByRole("dialog");
    await user.click(within(reject).getByRole("button", { name: "Tolak cuti" }));
    expect(await within(reject).findByText("Alasan penolakan wajib diisi")).toBeInTheDocument();
    await user.type(within(reject).getByLabelText("Alasan penolakan"), "Jadwal pengujian padat");
    await user.click(within(reject).getByRole("button", { name: "Tolak cuti" }));
    await waitFor(() => expect(api.reviewLeave).toHaveBeenCalledWith(7, "rejected", "Jadwal pengujian padat"));

    await user.click(screen.getByRole("button", { name: "Catat cuti" }));
    const form = await screen.findByRole("dialog");
    await user.selectOptions(await within(form).findByLabelText("Pentester"), "5");
    await user.type(within(form).getByLabelText("Tanggal mulai"), "2026-11-20");
    await user.type(within(form).getByLabelText("Tanggal selesai"), "2026-11-20");
    await user.click(within(form).getByRole("button", { name: "Simpan cuti" }));
    await waitFor(() =>
      expect(api.createLeave).toHaveBeenCalledWith({ sys_user_id: 5, start_date: "2026-11-20", end_date: "2026-11-20", reason: "" }),
    );
  });

  it("tech lead mengelola hari libur", async () => {
    const user = userEvent.setup();
    await mount("tech_lead", "/calendar?tab=libur", 2);
    await waitFor(() => expect(api.listHolidays).toHaveBeenCalledWith(2026));
    expect(await screen.findByText("Libur kantor")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Tanggal libur"), "2026-12-31");
    await user.type(screen.getByLabelText("Nama hari libur"), "Tutup buku");
    await user.click(screen.getByRole("button", { name: "Tambah hari libur" }));
    await waitFor(() => expect(api.createHoliday).toHaveBeenCalledWith({ date: "2026-12-31", name: "Tutup buku" }));
    await user.click(screen.getByRole("button", { name: "Hapus Libur kantor" }));
    await waitFor(() => expect(api.deleteHoliday).toHaveBeenCalledWith(1));
  });

  it("PM hanya melihat: tanpa tombol cuti dan tanpa form hari libur", async () => {
    await mount("project_manager", "/calendar?tab=cuti", 3);
    await screen.findByRole("table", { name: "Daftar cuti" });
    expect(screen.queryByRole("button", { name: /Ajukan cuti|Catat cuti/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Alasan" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Setujui cuti/ })).not.toBeInTheDocument();
  });
});
