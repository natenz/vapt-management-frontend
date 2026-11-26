import { describe, expect, it } from "vitest";
import type { CalendarPerson } from "@/entities/calendar";
import { dayEntries, gridRange, monthWeeks, shiftAnchor, weekOf } from "./grid";

const people: CalendarPerson[] = [
  {
    sys_user_id: 1,
    name: "Budi",
    workdays: 4,
    bookings: [
      {
        mandays_id: 10, project_id: 5, project_name: "VAPT HRIS", project_code: "HRS", asset_name: "Portal",
        start_date: "2026-12-01", end_date: "2026-12-04", allocated_mandays: 4, masked: false, warnings: ["other_project"],
      },
    ],
    leaves: [],
  },
  { sys_user_id: 2, name: "Citra", workdays: 4, bookings: [], leaves: [{ leave_id: 3, start_date: "2026-12-02", end_date: "2026-12-02", status: "approved" }] },
  { sys_user_id: 3, name: "Dimas", workdays: 5, bookings: [], leaves: [{ leave_id: 4, start_date: "2026-12-02", end_date: "2026-12-02", status: "pending" }] },
];
const holidays = [{ holiday_id: 1, date: "2026-12-03", name: "Libur kantor" }];

describe("grid kalender", () => {
  it("bulan dimulai Senin dan diakhiri Minggu", () => {
    const weeks = monthWeeks("2026-12");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]![0]).toBe("2026-11-30");
    expect(weeks[4]![6]).toBe("2027-01-03");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("minggu berisi Senin sampai Minggu dari tanggal acuan", () => {
    expect(weekOf("2026-12-03")).toEqual([
      "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06",
    ]);
  });

  it("rentang API mengikuti mode tampilan", () => {
    expect(gridRange("bulan", "2026-12-15")).toEqual({ from: "2026-11-30", to: "2027-01-03" });
    expect(gridRange("minggu", "2026-12-15")).toEqual({ from: "2026-12-14", to: "2026-12-20" });
  });

  it("geser periode sebelumnya dan berikutnya", () => {
    expect(shiftAnchor("bulan", "2026-12-15", 1)).toBe("2027-01-01");
    expect(shiftAnchor("bulan", "2026-01-31", -1)).toBe("2025-12-01");
    expect(shiftAnchor("minggu", "2026-12-15", -1)).toBe("2026-12-08");
  });

  it("status tiap orang pada hari kerja", () => {
    const day = dayEntries(people, holidays, "2026-12-02");
    expect(day.weekend).toBe(false);
    expect(day.holiday).toBeUndefined();
    expect(day.entries.map((e) => [e.person.name, e.bookings.length, e.leave?.status ?? null])).toEqual([
      ["Budi", 1, null],
      ["Citra", 0, "approved"],
      ["Dimas", 0, "pending"],
    ]);
    // Budi terisi, Citra cuti; Dimas cuti menunggu tetap dihitung tersedia.
    expect(day.available).toBe(1);
  });

  it("akhir pekan dan hari libur tidak punya ketersediaan", () => {
    expect(dayEntries(people, holidays, "2026-12-05")).toMatchObject({ weekend: true, available: 0 });
    const libur = dayEntries(people, holidays, "2026-12-03");
    expect(libur.holiday?.name).toBe("Libur kantor");
    expect(libur.available).toBe(0);
  });
});
