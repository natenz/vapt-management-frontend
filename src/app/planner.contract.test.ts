// Tes kontrak alur "Simpan ke server" lawan BE asli. Menulis ke proyek yang ditunjuk lalu membersihkannya.
//   CONTRACT_API=http://localhost:8088/api/v1 CONTRACT_PLAN_PROJECT=10 CONTRACT_PM=pm.sari npx vitest run src/app/planner.contract.test.ts
import { beforeAll, describe, expect, it } from "vitest";
import {
  createAsset,
  createMandays,
  deleteAsset,
  deleteMandays,
  getProject,
  updateAsset,
  updateMandays,
} from "@/entities/project";
import { useSession } from "@/entities/session";
import { login } from "@/features/auth";
import { buildOps, fromServer, newKey, runOps, type DraftAsset } from "@/features/asset-planner";
import { configureHttpAuth } from "@/shared/api";

const API = process.env.CONTRACT_API;
const PID = Number(process.env.CONTRACT_PLAN_PROJECT);
const PM = process.env.CONTRACT_PM ?? "";
const run = API && PID && PM ? describe : describe.skip;

run("planner -> BE asli", () => {
  beforeAll(async () => {
    (import.meta.env as Record<string, string>).VITE_API_BASE_URL = API!;
    configureHttpAuth({
      getToken: () => useSession.getState().token,
      onUnauthorized: () => useSession.getState().clear(),
    });
    useSession.getState().setSession(await login({ login: PM, password: "Password123!" }));
  });
  const api = {
    createAsset: (b: Parameters<typeof createAsset>[1]) => createAsset(PID, b),
    updateAsset,
    deleteAsset,
    createMandays: (
      assetId: number,
      b: { pentester_id: number; start_date: string; end_date: string; allocated_mandays: number },
    ) => createMandays(PID, { asset_id: assetId, status: "planned", ...b }),
    updateMandays,
    deleteMandays,
  };
  const commit = async (target: DraftAsset[]) => {
    const before = fromServer(await getProject(PID));
    await runOps(buildOps(before, target), api);
    return fromServer(await getProject(PID));
  };

  it("tambah aset 20 md + 2 pentester, tambah ke-3, kurangi ke 1, naik/turun kuota, lalu hapus (semua diterima BE)", async () => {
    const p0 = await getProject(PID);
    const pent = p0.resources
      .map((r) => r.user?.sys_user)
      .filter((u) => u?.role?.role_name === "pentester")
      .map((u) => u!.sys_user_id);
    expect(pent.length).toBeGreaterThanOrEqual(2);
    const start = p0.start_date!.slice(0, 10),
      end = p0.end_date!.slice(0, 10);
    const base = fromServer(p0);
    const row = (pid: number, md = "") => ({ key: newKey(), pentesterId: pid, start, end, md });
    const mk = (name: string): DraftAsset => ({
      key: newKey(),
      name,
      type: "mobile",
      domain: "",
      ip: "",
      mandays: "20",
      pentesters: [row(pent[0]!), row(pent[1]!)],
    });

    let state = await commit([...base, mk("ZZ-Planner-Mobile")]);
    let a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    const mdOf = async () =>
      (await getProject(PID)).mandays.filter((m) => m.asset_id === a.id).map((m) => m.allocated_mandays).sort();
    expect(await mdOf()).toEqual([10, 10]);

    a = { ...a, pentesters: [...a.pentesters, row(pent[2] ?? pent[0]!)] };
    state = await commit([...base, a]);
    a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    expect((await mdOf()).reduce((s, x) => s + x, 0)).toBeCloseTo(20, 5);
    expect(await mdOf()).toEqual([6.66, 6.67, 6.67]);

    a = { ...a, pentesters: a.pentesters.slice(0, 1) };
    state = await commit([...base, a]);
    a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    expect(await mdOf()).toEqual([20]);

    a = { ...a, mandays: "35" };
    state = await commit([...base, a]);
    a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    expect(await mdOf()).toEqual([35]);
    a = { ...a, mandays: "12" };
    state = await commit([...base, a]);
    a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    expect(await mdOf()).toEqual([12]);

    // Manual (permintaan PM): 11 md, 2 pentester. Otomatis 5,5 + 5,5 -> 5 + 6 -> ditukar 6 + 5
    a = { ...a, mandays: "11", pentesters: [row(pent[0]!), row(pent[1]!)] };
    state = await commit([...base, a]);
    a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    expect(await mdOf()).toEqual([5.5, 5.5]);
    a = { ...a, pentesters: [{ ...a.pentesters[0]!, md: "5" }, { ...a.pentesters[1]!, md: "6" }] };
    state = await commit([...base, a]);
    a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    expect(await mdOf()).toEqual([5, 6]);
    expect(a.pentesters.map((x) => x.md)).toEqual(["5", "6"]);
    a = { ...a, pentesters: [{ ...a.pentesters[0]!, md: "6" }, { ...a.pentesters[1]!, md: "5" }] };
    state = await commit([...base, a]);
    a = state.find((x) => x.name === "ZZ-Planner-Mobile")!;
    expect(await mdOf()).toEqual([5, 6]);
    expect(
      (await getProject(PID)).mandays
        .filter((m) => m.asset_id === a.id)
        .sort((x, y) => x.mandays_id - y.mandays_id)
        .map((m) => m.allocated_mandays),
    ).toEqual([6, 5]);

    state = await commit([...base, { ...a, removed: true }]);
    expect(state.find((x) => x.name === "ZZ-Planner-Mobile")).toBeUndefined();
    expect(state.map((x) => x.name)).toEqual(base.map((x) => x.name));
  });
});
