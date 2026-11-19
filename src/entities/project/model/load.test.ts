import { describe, expect, it } from "vitest";
import type { ProjectDetail } from "./types";
import { aggregateLoad, mandaysInMonth } from "./load";

const res = (uid: number) => ({
  resource_id: uid,
  project_id: 1,
  user_id: uid,
  user: { user_id: uid, full_name: `U${uid}`, sys_user_id: uid, sys_user: { sys_user_id: uid } },
});
// Penugasan satu hari di bulan uji (2026-11), jadi semua mandays masuk ke bulan itu.
const md = (pid: number, v: number, start = "2026-11-10", end = "2026-11-10") => ({
  mandays_id: pid * 100 + v,
  asset_id: 1,
  pentester_id: pid,
  allocated_mandays: v,
  project_id: 1,
  start_date: start,
  end_date: end,
});
const proj = (id: number, status: string, resources: number[], mandays: ReturnType<typeof md>[], pmId?: number) =>
  ({
    project_id: id,
    project_name: `P${id}`,
    pm_id: pmId,
    status: { status_process_id: 1, status_name: status },
    resources: resources.map(res),
    mandays,
  }) as unknown as ProjectDetail;

const NOV = "2026-11";

describe("aggregateLoad", () => {
  it("menjumlah mandays lintas proyek dan mencatat proyek yang diikuti", () => {
    const r = aggregateLoad(
      [
        proj(1, "Assessment", [5, 8], [md(5, 10), md(5, 2.5)]),
        proj(2, "Scoping", [5, 6], [md(5, 4), md(6, 3)]),
      ],
      NOV,
    );
    expect(r[5]).toEqual({
      mandays: 16.5,
      projects: [
        { id: 1, name: "P1", status: "Assessment", mandays: 12.5 },
        { id: 2, name: "P2", status: "Scoping", mandays: 4 },
      ],
    });
    expect(r[6]!.mandays).toBe(3);
  });
  it("PM proyek (pm_id) ikut tercatat di proyek aktif meski tidak masuk trx_resource", () => {
    const r = aggregateLoad([proj(1, "Assessment", [5], [md(5, 4)], 3), proj(2, "Done", [5], [md(5, 4)], 3)], NOV);
    expect(r[3]).toEqual({ mandays: 0, projects: [{ id: 1, name: "P1", status: "Assessment" }] });
  });
  it("writer: hanya proyek, mandays 0", () => {
    expect(aggregateLoad([proj(1, "Initial Report", [8], [])], NOV)[8]).toEqual({
      mandays: 0,
      projects: [{ id: 1, name: "P1", status: "Initial Report" }],
    });
  });
  it("proyek Done tetap memakai kapasitas bulannya tapi tidak lagi jadi 'proyek aktif'", () => {
    expect(aggregateLoad([proj(1, "Done", [5], [md(5, 12)])], NOV)).toEqual({ 5: { mandays: 12, projects: [] } });
  });
  it("proyek Done yang tidak menyentuh bulan itu tidak muncul", () => {
    expect(aggregateLoad([proj(1, "Done", [5], [md(5, 30)])], "2026-12")).toEqual({});
  });
  it("orang yang tidak ikut proyek aktif tidak ada di hasil (dianggap 0 oleh pemanggil)", () => {
    expect(aggregateLoad([proj(1, "Assessment", [5], [md(5, 1)])], NOV)[7]).toBeUndefined();
  });
  it("tanpa float: 0,1 + 0,2 = 0,3", () => {
    expect(aggregateLoad([proj(1, "Assessment", [5], [md(5, 0.1), md(5, 0.2)])], NOV)[5]!.mandays).toBe(0.3);
  });
});

describe("mandays per bulan (reset tiap bulan)", () => {
  // 20 md dibagi rata di 20 hari kalender: 29 Okt .. 17 Nov = 3 hari Okt (29,30,31) + 17 hari Nov.
  const a = { start_date: "2026-10-29", end_date: "2026-11-17", allocated_mandays: 20 };
  it("penugasan lintas bulan dibagi proporsional per hari kalender", () => {
    expect(mandaysInMonth(a, "2026-10")).toBeCloseTo(3, 5);
    expect(mandaysInMonth(a, "2026-11")).toBeCloseTo(17, 5);
    expect(mandaysInMonth(a, "2026-10") + mandaysInMonth(a, "2026-11")).toBeCloseTo(20, 5);
  });
  it("bulan di luar jadwal = 0, jadi ganti bulan beban kembali ke 0", () => {
    expect(mandaysInMonth(a, "2026-09")).toBe(0);
    expect(mandaysInMonth(a, "2026-12")).toBe(0);
  });
  it("penugasan satu hari memasukkan semuanya ke bulannya; tanpa tanggal = 0", () => {
    expect(mandaysInMonth({ start_date: "2026-11-30", end_date: "2026-11-30", allocated_mandays: 5 }, "2026-11")).toBe(5);
    expect(mandaysInMonth({ allocated_mandays: 5 }, "2026-11")).toBe(0);
  });
  it("aggregateLoad memakai porsi bulan yang diminta", () => {
    const p = proj(1, "Assessment", [5], [{ ...md(5, 20), start_date: a.start_date, end_date: a.end_date }]);
    expect(aggregateLoad([p], "2026-10")[5]!.mandays).toBe(3);
    expect(aggregateLoad([p], "2026-11")[5]!.mandays).toBe(17);
  });
});
