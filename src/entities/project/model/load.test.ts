import { describe, expect, it } from "vitest";
import type { ProjectDetail } from "./types";
import { aggregateLoad } from "./load";

const res = (uid: number) => ({
  resource_id: uid,
  project_id: 1,
  user_id: uid,
  user: { user_id: uid, full_name: `U${uid}`, sys_user_id: uid, sys_user: { sys_user_id: uid } },
});
const md = (pid: number, v: number) => ({
  mandays_id: pid * 100 + v,
  asset_id: 1,
  pentester_id: pid,
  allocated_mandays: v,
  project_id: 1,
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

describe("aggregateLoad", () => {
  it("menjumlah mandays lintas proyek dan mencatat proyek yang diikuti", () => {
    const r = aggregateLoad([
      proj(1, "Pentest", [5, 8], [md(5, 10), md(5, 2.5)]),
      proj(2, "Planning", [5, 6], [md(5, 4), md(6, 3)]),
    ]);
    expect(r[5]).toEqual({ mandays: 16.5, projects: [{ id: 1, name: "P1" }, { id: 2, name: "P2" }] });
    expect(r[6]!.mandays).toBe(3);
  });
  it("PM proyek (pm_id) ikut tercatat di proyek aktif meski tidak masuk trx_resource", () => {
    const r = aggregateLoad([
      proj(1, "Pentest", [5], [md(5, 4)], 3),
      proj(2, "Done", [5], [md(5, 4)], 3),
    ]);
    expect(r[3]).toEqual({ mandays: 0, projects: [{ id: 1, name: "P1" }] });
  });
  it("writer: hanya proyek, mandays 0", () => {
    expect(aggregateLoad([proj(1, "Reporting", [8], [])])[8]).toEqual({ mandays: 0, projects: [{ id: 1, name: "P1" }] });
  });
  it("proyek Done tidak dihitung", () => {
    expect(aggregateLoad([proj(1, "Done", [5], [md(5, 30)])])).toEqual({});
  });
  it("orang yang tidak ikut proyek aktif tidak ada di hasil (dianggap 0 oleh pemanggil)", () => {
    expect(aggregateLoad([proj(1, "Pentest", [5], [md(5, 1)])])[7]).toBeUndefined();
  });
  it("tanpa float: 0,1 + 0,2 = 0,3", () => {
    expect(aggregateLoad([proj(1, "Pentest", [5], [md(5, 0.1), md(5, 0.2)])])[5]!.mandays).toBe(0.3);
  });
});
