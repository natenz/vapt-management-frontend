import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { TeamCalendar as Data } from "@/entities/calendar";
import { TeamCalendar } from "./team-calendar";

const data: Data = {
  from: "2026-11-30",
  to: "2027-01-03",
  holidays: [{ holiday_id: 1, date: "2026-12-03", name: "Libur kantor" }],
  people: [
    {
      sys_user_id: 1,
      name: "Budi",
      workdays: 4,
      bookings: [
        {
          mandays_id: 10, project_id: 5, project_name: "VAPT HRIS", project_code: "HRS", asset_name: "Portal",
          start_date: "2026-12-01", end_date: "2026-12-04", allocated_mandays: 4, masked: false, warnings: ["other_project"],
        },
        {
          mandays_id: 11, project_id: 0, project_name: "", project_code: "", asset_name: "",
          start_date: "2026-12-02", end_date: "2026-12-02", allocated_mandays: 1, masked: true, warnings: [],
        },
      ],
      leaves: [],
    },
    { sys_user_id: 2, name: "Citra", workdays: 4, bookings: [], leaves: [{ leave_id: 3, start_date: "2026-12-02", end_date: "2026-12-02", status: "approved" }] },
  ],
};

const renderCalendar = (mode: "bulan" | "minggu") =>
  render(
    <MemoryRouter>
      <TeamCalendar data={data} isLoading={false} mode={mode} anchor="2026-12-01" />
    </MemoryRouter>,
  );

describe("TeamCalendar", () => {
  it("tampilan bulan: isi sel hari, nonkerja, dan libur", () => {
    renderCalendar("bulan");
    const cell = screen.getByRole("button", { name: /^2 Desember 2026/ });
    expect(within(cell).getByText("Budi · HRS")).toBeInTheDocument();
    expect(within(cell).getByText("Budi · Proyek lain")).toBeInTheDocument();
    expect(within(cell).getByText("Citra · Cuti")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /^5 Desember 2026/ })).getByText("Nonkerja")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /^3 Desember 2026/ })).getByText("Libur kantor")).toBeInTheDocument();
  });

  it("tampilan bulan: hari libur dan akhir pekan tidak menampilkan penugasan", () => {
    renderCalendar("bulan");
    // Penugasan HRS Budi mencakup 1–4 Des, tapi 3 Des hari libur.
    expect(within(screen.getByRole("button", { name: /^3 Desember 2026/ })).queryByText("Budi · HRS")).not.toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /^4 Desember 2026/ })).getByText("Budi · HRS")).toBeInTheDocument();
  });

  it("klik tanggal membuka detail tiap orang beserta peringatan", async () => {
    renderCalendar("bulan");
    await userEvent.click(screen.getByRole("button", { name: /^1 Desember 2026/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "VAPT HRIS" })).toHaveAttribute("href", "/projects/5");
    expect(within(dialog).getByText(/Portal/)).toBeInTheDocument();
    expect(within(dialog).getByText("Proyek lain")).toBeInTheDocument();
    expect(within(dialog).getByText("Tersedia")).toBeInTheDocument();
  });

  it("tampilan minggu: satu baris per orang", () => {
    renderCalendar("minggu");
    const table = screen.getByRole("table", { name: "Jadwal mingguan tim" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]!).getByText("Budi")).toBeInTheDocument();
    expect(within(rows[2]!).getAllByText("Cuti")).toHaveLength(1);
    expect(within(rows[1]!).getAllByText("Libur").length).toBeGreaterThanOrEqual(1);
  });
});
