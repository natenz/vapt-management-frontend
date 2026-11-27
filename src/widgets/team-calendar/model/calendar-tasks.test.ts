import { describe, expect, it } from "vitest";
import type { CalendarBooking, TeamCalendar } from "@/entities/calendar";
import { buildCalendarTasks } from "./calendar-tasks";

const range = { start: new Date(2026, 11, 1), end: new Date(2026, 11, 31) };

const booking = (over: Partial<CalendarBooking> = {}): CalendarBooking => ({
  mandays_id: 1, project_id: 3, project_name: "VAPT HRIS", project_code: "PRJ-3", asset_name: "Portal",
  start_date: "2026-12-07", end_date: "2026-12-11", allocated_mandays: 5, masked: false, warnings: [], ...over,
});

const data: TeamCalendar = {
  from: "2026-12-01",
  to: "2026-12-31",
  holidays: [],
  people: [
    {
      sys_user_id: 5, name: "Budi Santoso", workdays: 23,
      bookings: [
        booking({ mandays_id: 2, start_date: "2026-11-25", end_date: "2026-12-02" }),
        booking({ warnings: ["other_project", "exceeds_workdays"] }),
        booking({ mandays_id: 3, start_date: "2027-01-04", end_date: "2027-01-08" }),
      ],
    },
    { sys_user_id: 6, name: "Citra", workdays: 23, bookings: [] },
  ],
};

describe("buildCalendarTasks", () => {
  it("membuat satu baris per pentester diikuti penugasannya di rentang itu", () => {
    const rows = buildCalendarTasks(data, range);
    expect(rows.map((r) => r.id)).toEqual(["user:5", "booking:2", "booking:1", "user:6"]);
    expect(rows[0]).toMatchObject({ kind: "person", name: "Budi Santoso", bookingCount: 2, open: true });
    expect(rows[2]).toMatchObject({
      kind: "booking", parent: "user:5", text: "VAPT HRIS · Portal", projectId: 3, allocatedMandays: 5,
      // SVAR hanya aman membawa nilai primitif, jadi peringatan diringkas jadi satu teks.
      warning: "Proyek lain, MD > hari kerja",
    });
    // Orang tanpa penugasan tetap tampil supaya terlihat siapa yang kosong.
    expect(rows[3]).toMatchObject({ kind: "person", name: "Citra", bookingCount: 0 });
    // Baris pentester membentang sepanjang rentang agar labelnya bisa menempel saat chart digeser.
    for (const person of [rows[0]!, rows[3]!]) {
      expect(person).toMatchObject({ type: "task", start: new Date(2026, 11, 1), end: new Date(2027, 0, 1) });
    }
  });

  it("memotong batang ke rentang yang ditampilkan tanpa mengubah tanggal asli", () => {
    const row = buildCalendarTasks(data, range).find((r) => r.id === "booking:2")!;
    expect(row.start).toEqual(new Date(2026, 11, 1));
    expect(row.end).toEqual(new Date(2026, 11, 3)); // batas kanan SVAR eksklusif
    expect(row).toMatchObject({ startDate: "2026-11-25", endDate: "2026-12-02" });
  });

  it("menyamarkan proyek PM lain", () => {
    const hidden = booking({ masked: true, project_id: 0, project_name: "", project_code: "", asset_name: "" });
    const rows = buildCalendarTasks({ ...data, people: [{ ...data.people[0]!, bookings: [hidden] }] }, range);
    expect(rows[1]).toMatchObject({ text: "Proyek lain", masked: true });
    expect(rows[1]!.projectId).toBeUndefined();
  });

  it("mempertahankan baris yang diciutkan", () => {
    expect(buildCalendarTasks(data, range, new Set(["user:5"]))[0]!.open).toBe(false);
  });

  it("kosong bila data belum ada", () => {
    expect(buildCalendarTasks(undefined, range)).toEqual([]);
  });
});
