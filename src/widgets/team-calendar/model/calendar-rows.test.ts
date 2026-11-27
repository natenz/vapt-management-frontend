import { describe, expect, it } from "vitest";
import type { CalendarBooking, TeamCalendar } from "@/entities/calendar";
import { buildProjectRows, type CalendarRow } from "./calendar-rows";

const range = { start: new Date(2026, 11, 1), end: new Date(2026, 11, 31) };

const booking = (over: Partial<CalendarBooking> = {}): CalendarBooking => ({
  mandays_id: 1, project_id: 3, project_name: "VAPT HRIS", project_code: "PRJ-3", asset_name: "Portal",
  start_date: "2026-12-04", end_date: "2026-12-10", allocated_mandays: 4, masked: false, warnings: [], ...over,
});
const billing = (over: Partial<CalendarBooking> = {}) =>
  booking({ project_id: 4, project_name: "VAPT Billing", asset_name: "Web", ...over });
const person = (sys_user_id: number, name: string, bookings: CalendarBooking[]) => ({ sys_user_id, name, workdays: 22, bookings });

/** Budi dipesan HRIS (4–10) dan Billing (8–11) sekaligus; Citra di Billing 14–15; Dimas kosong. */
const data: TeamCalendar = {
  from: "2026-12-01",
  to: "2026-12-31",
  holidays: [{ holiday_id: 1, date: "2026-12-09", name: "Libur kantor" }],
  people: [
    person(5, "Budi Santoso", [
      booking({ warnings: ["other_project"] }),
      billing({ mandays_id: 2, asset_name: "API", start_date: "2026-12-08", end_date: "2026-12-11", warnings: ["other_project"] }),
    ]),
    person(6, "Citra", [billing({ mandays_id: 3, start_date: "2026-12-14", end_date: "2026-12-15", allocated_mandays: 2 })]),
    person(7, "Dimas", []),
  ],
};

const days = (row: CalendarRow) => row.segments.map((s) => `${s.startsAt.slice(8)}-${s.endsAt.slice(8)}${s.conflict ? "!" : ""}`);
const build = (calendar: TeamCalendar | undefined = data, options: Partial<Parameters<typeof buildProjectRows>[2]> = {}) =>
  buildProjectRows(calendar, range, { splitDays: true, ...options });

describe("buildProjectRows", () => {
  it("membuat satu baris per proyek, urut tanggal mulai, tanpa baris untuk orang yang kosong", () => {
    const rows = build();
    expect(rows.map((r) => [r.id, r.name, r.projectId])).toEqual([
      ["project:3", "VAPT HRIS", 3],
      ["project:4", "VAPT Billing", 4],
    ]);
  });

  it("batang mengikuti hari yang ada penugasannya, putus di akhir pekan dan libur, merah di hari bentrok", () => {
    const [hris, bill] = build();
    expect(days(hris!)).toEqual(["04-04", "07-07", "08-08!", "10-10!"]);
    expect(days(bill!)).toEqual(["08-08!", "10-10!", "11-11", "14-15"]);
    expect(hris!.segments[0]).toMatchObject({ left: (3 / 31) * 100, width: (1 / 31) * 100 });
  });

  it("mencatat pentester tiap proyek beserta proyek yang membentrokkannya", () => {
    const [hris, bill] = build();
    expect(hris!.entries).toEqual([
      {
        mandaysId: 1, person: "Budi Santoso", asset: "Portal", startDate: "2026-12-04", endDate: "2026-12-10",
        allocatedMandays: 4, warning: "Bentrok dengan VAPT Billing",
      },
    ]);
    expect(bill!.entries.map((e) => [e.person, e.asset, e.warning])).toEqual([
      ["Budi Santoso", "API", "Bentrok dengan VAPT HRIS"],
      ["Citra", "Web", ""],
    ]);
  });

  it("penugasan yang MD-nya melebihi hari kerja merah seluruhnya", () => {
    const calendar = { ...data, people: [person(6, "Citra", [billing({ start_date: "2026-12-14", end_date: "2026-12-15", warnings: ["exceeds_workdays"] })])] };
    const [row] = build(calendar);
    expect(days(row!)).toEqual(["14-15!"]);
    expect(row!.entries[0]!.warning).toBe("MD > hari kerja");
  });

  it("menggabungkan proyek PM lain jadi satu baris paling bawah", () => {
    const hidden = { masked: true, project_id: 0, project_name: "", project_code: "", asset_name: "" };
    const calendar = {
      ...data,
      people: [
        person(6, "Citra", [
          booking({ ...hidden, mandays_id: 8, start_date: "2026-12-01", end_date: "2026-12-02" }),
          booking({ ...hidden, mandays_id: 9, start_date: "2026-12-14", end_date: "2026-12-14", warnings: ["other_project"] }),
          billing({ mandays_id: 3, start_date: "2026-12-14", end_date: "2026-12-15", warnings: ["other_project"] }),
        ]),
      ],
    };
    const rows = build(calendar);
    expect(rows.map((r) => r.name)).toEqual(["VAPT Billing", "Proyek lain"]);
    expect(rows[1]).toMatchObject({ id: "project:masked", masked: true });
    expect(rows[1]!.projectId).toBeUndefined();
    expect(days(rows[1]!)).toEqual(["01-02", "14-14!"]);
    expect(rows[0]!.entries[0]!.warning).toBe("Bentrok dengan proyek lain");
  });

  it("filter pentester dan proyek menyaring baris tanpa menghilangkan tanda bentrok", () => {
    const byPerson = build(data, { filters: { personId: 6, projectId: 0 } });
    expect(byPerson.map((r) => r.id)).toEqual(["project:4"]);
    expect(byPerson[0]!.entries.map((e) => e.person)).toEqual(["Citra"]);

    const byProject = build(data, { filters: { personId: 0, projectId: 3 } });
    expect(byProject.map((r) => r.id)).toEqual(["project:3"]);
    expect(days(byProject[0]!)).toEqual(["04-04", "07-07", "08-08!", "10-10!"]);
  });

  it("pada skala minggu dan bulan batang tidak diputus di hari nonkerja", () => {
    const [hris] = build(data, { splitDays: false });
    expect(days(hris!)).toEqual(["04-07", "08-08!", "09-09", "10-10!"]);
  });

  it("memotong ke rentang tampilan tanpa mengubah tanggal asli, dan membuang yang di luar rentang", () => {
    const calendar = {
      ...data,
      holidays: [],
      people: [
        person(6, "Citra", [
          billing({ start_date: "2026-11-25", end_date: "2026-12-02" }),
          booking({ mandays_id: 2, start_date: "2027-01-04", end_date: "2027-01-08" }),
        ]),
      ],
    };
    const rows = build(calendar);
    expect(rows.map((r) => r.id)).toEqual(["project:4"]);
    expect(days(rows[0]!)).toEqual(["01-02"]);
    expect(rows[0]!.entries[0]).toMatchObject({ startDate: "2026-11-25", endDate: "2026-12-02" });
  });

  it("penugasan yang seluruhnya jatuh di hari nonkerja tetap digambar", () => {
    const calendar = { ...data, people: [person(6, "Citra", [billing({ start_date: "2026-12-05", end_date: "2026-12-06" })])] };
    expect(days(build(calendar)[0]!)).toEqual(["05-06"]);
  });

  it("kosong bila data belum ada", () => {
    expect(buildProjectRows(undefined, range, { splitDays: true })).toEqual([]);
  });
});
