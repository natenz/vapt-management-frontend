import { describe, expect, it } from "vitest";
import {
  allocate,
  buildOps,
  CommitError,
  fromServer,
  newKey,
  runOps,
  splitMandays,
  validate,
  type AssetBody,
  type DraftAsset,
  type PlanApi,
} from "./asset-plan";

const range = { start: "2026-11-16", end: "2026-12-11" };
const row = (pid: number | null, mandaysId?: number, start = "2026-11-16", end = "2026-11-20", md = "") => ({
  key: newKey(),
  mandaysId,
  pentesterId: pid,
  start,
  end,
  md,
});
const asset = (o: Partial<DraftAsset> = {}): DraftAsset => ({
  key: newKey(),
  name: "Mobile App",
  type: "mobile",
  domain: "",
  ip: "",
  mandays: "20",
  pentesters: [],
  ...o,
});

describe("splitMandays (mandays aset dibagi jumlah pentester)", () => {
  it("contoh dari spesifikasi: 20 md / 2 pentester = 10 + 10", () => expect(splitMandays(20, 2)).toEqual([10, 10]));
  it("tidak habis dibagi: jumlahnya tetap persis total (20/3 = 6,67 + 6,67 + 6,66)", () => {
    expect(splitMandays(20, 3)).toEqual([6.67, 6.67, 6.66]);
  });
  it("jumlah selalu persis total untuk banyak kombinasi", () => {
    for (const t of [0.5, 1, 2.5, 7, 13, 20, 21, 33.33, 100])
      for (let n = 1; n <= 9; n++) {
        expect(Math.round(splitMandays(t, n).reduce((a, b) => a + b, 0) * 100)).toBe(Math.round(t * 100));
      }
  });
  it("tanpa pentester => kosong", () => expect(splitMandays(20, 0)).toEqual([]));
});

describe("allocate (manual atau otomatis)", () => {
  const r = (...md: string[]) => md.map((x) => ({ md: x }));
  it("semua otomatis = bagi rata (11 md / 2 = 5,5 + 5,5)", () => expect(allocate(11, r("", "")).shares).toEqual([5.5, 5.5]));
  it("permintaan user: 11 md dibagi manual 5 + 6", () => {
    const a = allocate(11, r("5", "6"));
    expect(a.shares).toEqual([5, 6]);
    expect(a.remaining).toBe(0);
  });
  it("manual sebagian: sisa dibagi ke yang otomatis (20 md: 5 manual, 2 otomatis => 7,5 + 7,5)", () => {
    expect(allocate(20, r("5", "", "")).shares).toEqual([5, 7.5, 7.5]);
  });
  it("kurang dari kuota => ada sisa; lebih dari kuota => remaining negatif", () => {
    expect(allocate(11, r("5", "4")).remaining).toBe(2);
    expect(allocate(11, r("5", "7")).remaining).toBe(-1);
  });
  it("tidak kena pembulatan float (0,1 + 0,2 dst) untuk ribuan kombinasi", () => {
    for (let T = 1; T <= 30; T++)
      for (let a = 1; a < T * 10; a++) {
        const x = allocate(T, r(String(a / 10), String(T - a / 10)));
        expect(x.remaining).toBe(0);
      }
  });
});

describe("validate", () => {
  it("draft valid => tanpa pesan", () => {
    expect(validate([asset({ pentesters: [row(5)] })], range)).toEqual({});
  });
  it("manual melebihi mandays aset ditolak dengan angka yang jelas; pas atau kurang diterima", () => {
    const lebih = asset({
      mandays: "11",
      pentesters: [row(5, undefined, "2026-11-16", "2026-11-20", "5"), row(6, undefined, "2026-11-16", "2026-11-20", "7")],
    });
    expect((validate([lebih], range)[lebih.key] ?? []).join(" ")).toContain("Total mandays pentester (12 md) melebihi mandays aset (11 md)");
    const pas = asset({
      mandays: "11",
      pentesters: [row(5, undefined, "2026-11-16", "2026-11-20", "5"), row(6, undefined, "2026-11-16", "2026-11-20", "6")],
    });
    expect(validate([pas], range)).toEqual({});
    const kurang = asset({
      mandays: "11",
      pentesters: [row(5, undefined, "2026-11-16", "2026-11-20", "3"), row(6, undefined, "2026-11-16", "2026-11-20", "4")],
    });
    expect(validate([kurang], range)).toEqual({});
  });
  it("manual 0, negatif, atau lebih dari 2 desimal ditolak; otomatis tanpa sisa ditolak", () => {
    const a = asset({
      mandays: "10",
      pentesters: [row(5, undefined, "2026-11-16", "2026-11-20", "0"), row(6, undefined, "2026-11-16", "2026-11-20", "1.234")],
    });
    const msg = (validate([a], range)[a.key] ?? []).join(" | ");
    expect(msg).toContain("mandays harus lebih dari 0");
    expect(msg).toContain("maksimal 2 angka di belakang koma");
    const starved = asset({ mandays: "10", pentesters: [row(5, undefined, "2026-11-16", "2026-11-20", "10"), row(6)] });
    expect((validate([starved], range)[starved.key] ?? []).join(" ")).toContain("Tidak ada sisa mandays");
  });
  it("mandays 0, nama kosong, IP salah, pentester ganda, tanggal di luar rentang", () => {
    const a = asset({
      name: "",
      mandays: "0",
      ip: "2121",
      pentesters: [row(5), row(5), row(6, undefined, "2026-10-01", "2026-10-05"), row(null), row(7, undefined, "2026-11-20", "2026-11-18")],
    });
    const msg = (validate([a], range)[a.key] ?? []).join(" | ");
    for (const need of [
      "Nama aset wajib diisi",
      "Mandays aset harus lebih dari 0",
      "IP address tidak valid",
      "sudah ditugaskan di aset ini",
      "di dalam rentang proyek",
      "pilih pentester",
      "sebelum tanggal mulai",
    ])
      expect(msg).toContain(need);
  });
  it("aset yang akan dihapus tidak divalidasi", () => {
    expect(validate([asset({ name: "", removed: true })], range)).toEqual({});
  });
});

// ---- BE tiruan: dua aturan yang diterapkan service BE (validateMandays + UpdateAsset) ----
function fakeBE(initial: DraftAsset[]) {
  type Row = { id: number; assetId: number; pid: number; md: number };
  const assets = new Map<number, { md: number; name: string }>();
  const rows = new Map<number, Row>();
  let next = 1000;
  for (const a of initial) {
    assets.set(a.id!, { md: Number(a.mandays), name: a.name });
    for (const p of a.pentesters)
      rows.set(p.mandaysId!, {
        id: p.mandaysId!,
        assetId: a.id!,
        pid: p.pentesterId!,
        md: splitMandays(Number(a.mandays), a.pentesters.length)[a.pentesters.indexOf(p)]!,
      });
  }
  const sum = (assetId: number, except = -1) =>
    Math.round([...rows.values()].filter((r) => r.assetId === assetId && r.id !== except).reduce((n, r) => n + r.md * 100, 0)) / 100;
  const api: PlanApi & { calls: string[] } = {
    calls: [],
    async createAsset(b: AssetBody) {
      api.calls.push("asset.create");
      const id = next++;
      assets.set(id, { md: b.mandays, name: b.asset_name });
      return { assets_id: id };
    },
    async updateAsset(id, b) {
      api.calls.push("asset.update");
      if (b.ip_address === "") throw new Error("ip_address: failed on 'ip'");
      if (b.mandays < sum(id)) throw new Error("asset mandays cannot be lower than mandays already allocated");
      assets.get(id)!.md = b.mandays;
    },
    async deleteAsset(id) {
      api.calls.push("asset.delete");
      assets.delete(id);
      for (const r of [...rows.values()]) if (r.assetId === id) rows.delete(r.id);
    },
    async createMandays(assetId, b) {
      api.calls.push("mandays.create");
      if (sum(assetId) + b.allocated_mandays > assets.get(assetId)!.md + 1e-9)
        throw new Error("allocated mandays exceed the asset's mandays");
      rows.set(next, { id: next++, assetId, pid: b.pentester_id, md: b.allocated_mandays });
    },
    async updateMandays(id, b) {
      api.calls.push("mandays.update");
      const r = rows.get(id)!;
      if (sum(r.assetId, id) + b.allocated_mandays > assets.get(r.assetId)!.md + 1e-9)
        throw new Error("allocated mandays exceed the asset's mandays");
      r.md = b.allocated_mandays;
      r.pid = b.pentester_id;
    },
    async deleteMandays(id) {
      api.calls.push("mandays.delete");
      rows.delete(id);
    },
  };
  return { api, assets, rows, sum };
}

const saved = (id: number, md: number, pids: number[]): DraftAsset =>
  asset({
    key: `a${id}`,
    id,
    name: `Aset ${id}`,
    mandays: String(md),
    pentesters: pids.map((p, i) => ({
      key: `m${id}${i}`,
      mandaysId: id * 10 + i,
      pentesterId: p,
      start: "2026-11-16",
      end: "2026-11-20",
      md: "",
    })),
  });

describe("buildOps + runOps lawan aturan BE", () => {
  it("alur utama spesifikasi: tambah aset mobile 20 md, assign 2 pentester => 10 + 10, hanya saat Simpan", async () => {
    const be = fakeBE([]);
    const draft = asset({ pentesters: [row(5), row(6)] });
    expect(be.api.calls).toEqual([]);
    const ops = buildOps([], [draft]);
    expect(ops.map((o) => o.t)).toEqual(["asset.create", "mandays.create", "mandays.create"]);
    await runOps(ops, be.api);
    expect([...be.rows.values()].map((r) => r.md)).toEqual([10, 10]);
  });

  it("tanpa perubahan => tidak ada operasi", () => {
    const s = [saved(1, 20, [5, 6])];
    expect(buildOps(s, structuredClone(s))).toEqual([]);
  });

  it("tambah pentester ke-3 pada aset 20 md: share dihitung ulang tanpa melanggar kuota", async () => {
    const s = [saved(1, 20, [5, 6])];
    const be = fakeBE(s);
    const d = structuredClone(s);
    d[0]!.pentesters.push(row(7));
    await runOps(buildOps(s, d), be.api);
    expect([...be.rows.values()].map((r) => r.md).sort()).toEqual([6.66, 6.67, 6.67]);
    expect(be.sum(1)).toBe(20);
  });

  it("hapus satu pentester: sisanya naik ke 20 md (hapus dulu, baru ubah)", async () => {
    const s = [saved(1, 20, [5, 6])];
    const be = fakeBE(s);
    const d = structuredClone(s);
    d[0]!.pentesters.pop();
    const ops = buildOps(s, d);
    expect(ops.map((o) => o.t)).toEqual(["mandays.delete", "mandays.update"]);
    await runOps(ops, be.api);
    expect([...be.rows.values()].map((r) => r.md)).toEqual([20]);
  });

  it("naikkan mandays aset: kuota naik dulu, baru share baris", async () => {
    const s = [saved(1, 10, [5, 6])];
    const be = fakeBE(s);
    const d = structuredClone(s);
    d[0]!.mandays = "30";
    const ops = buildOps(s, d);
    expect(ops[0]!.t).toBe("asset.update");
    await runOps(ops, be.api);
    expect(be.sum(1)).toBe(30);
  });

  it("turunkan mandays aset: share baris turun dulu, kuota paling akhir", async () => {
    const s = [saved(1, 30, [5, 6])];
    const be = fakeBE(s);
    const d = structuredClone(s);
    d[0]!.mandays = "10";
    const ops = buildOps(s, d);
    expect(ops.at(-1)!.t).toBe("asset.update");
    await runOps(ops, be.api);
    expect(be.sum(1)).toBe(10);
  });

  it("fromServer: baris yang persis rata = otomatis; selain itu manual (angka server tidak berubah diam-diam)", () => {
    const mk = (mds: number[], total: number) =>
      ({
        assets: [{ assets_id: 1, asset_name: "A", asset_type: "web", mandays: total, project_id: 1 }],
        mandays: mds.map((m, i) => ({
          mandays_id: i + 1,
          asset_id: 1,
          pentester_id: 5 + i,
          allocated_mandays: m,
          start_date: "2026-11-16",
          end_date: "2026-11-20",
        })),
        resources: [],
      }) as unknown as Parameters<typeof fromServer>[0];
    expect(fromServer(mk([5.5, 5.5], 11))[0]!.pentesters.map((p) => p.md)).toEqual(["", ""]);
    expect(fromServer(mk([5, 6], 11))[0]!.pentesters.map((p) => p.md)).toEqual(["5", "6"]);
    expect(buildOps(fromServer(mk([5, 6], 11)), fromServer(mk([5, 6], 11)))).toEqual([]);
  });

  it("PM mengubah 5,5 + 5,5 menjadi 5 + 6: dua update, tidak pernah melewati kuota di tengah jalan, hasil 5 dan 6", async () => {
    const s = [saved(1, 11, [5, 6])];
    const be = fakeBE(s);
    const d = structuredClone(s);
    d[0]!.pentesters[0]!.md = "5";
    d[0]!.pentesters[1]!.md = "6";
    const ops = buildOps(s, d);
    expect(ops.map((o) => o.t)).toEqual(["mandays.update", "mandays.update"]);
    await runOps(ops, be.api);
    expect([...be.rows.values()].map((r) => r.md).sort()).toEqual([5, 6]);
  });

  it("menukar 5/6 menjadi 6/5 (kuota penuh): update yang menurunkan jalan dulu", async () => {
    const s = [saved(1, 11, [5, 6])];
    s[0]!.pentesters[0]!.md = "5";
    s[0]!.pentesters[1]!.md = "6";
    const be = fakeBE(s);
    [...be.rows.values()][0]!.md = 5;
    [...be.rows.values()][1]!.md = 6;
    const d = structuredClone(s);
    d[0]!.pentesters[0]!.md = "6";
    d[0]!.pentesters[1]!.md = "5";
    await runOps(buildOps(s, d), be.api);
    expect([...be.rows.values()].map((r) => r.md)).toEqual([6, 5]);
  });

  it("regresi dari tes BE asli: update aset tanpa IP tidak mengirim ip_address kosong", async () => {
    const s = [saved(1, 10, [5])];
    const be = fakeBE(s);
    const d = structuredClone(s);
    d[0]!.mandays = "30";
    const ops = buildOps(s, d);
    expect(JSON.stringify(ops)).not.toContain('"ip_address":""');
    await runOps(ops, be.api);
    expect(be.sum(1)).toBe(30);
  });

  it("IP tersimpan tidak bisa dikosongkan: ditolak di UI dengan penjelasan, bukan error mentah dari BE", () => {
    const s = [{ ...saved(1, 10, [5]), ip: "10.0.0.1" }];
    const d = structuredClone(s);
    d[0]!.ip = "";
    expect((validate(d, range, s)[d[0]!.key] ?? []).join(" ")).toContain("tidak bisa dikosongkan");
    expect(validate(d, range)).toEqual({});
  });

  it("hapus aset tersimpan", async () => {
    const s = [saved(1, 20, [5]), saved(2, 8, [6])];
    const be = fakeBE(s);
    const d = structuredClone(s);
    d[0]!.removed = true;
    await runOps(buildOps(s, d), be.api);
    expect([...be.assets.keys()]).toEqual([2]);
  });

  it("300 skenario acak: tidak pernah ditolak BE dan jumlah share selalu = mandays aset", async () => {
    let seed = 7;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (let it = 0; it < 300; it++) {
      const s = [saved(1, 1 + rnd(40), Array.from({ length: 1 + rnd(4) }, (_, i) => 5 + i))];
      const be = fakeBE(s);
      const d = structuredClone(s);
      d[0]!.mandays = String(1 + rnd(40));
      const n = 1 + rnd(5);
      d[0]!.pentesters = Array.from({ length: n }, (_, i) => d[0]!.pentesters[i] ?? row(5 + i));
      await runOps(buildOps(s, d), be.api);
      expect(be.sum(1)).toBe(Number(d[0]!.mandays));
      expect([...be.rows.values()]).toHaveLength(n);
    }
  });

  it("gagal di tengah: berhenti, melaporkan progres, dan id aset baru dicatat supaya tidak ganda", async () => {
    const be = fakeBE([]);
    const draft = asset({ pentesters: [row(5), row(6)] });
    let calls = 0;
    const api = {
      ...be.api,
      createMandays: async (id: number, b: Parameters<PlanApi["createMandays"]>[1]) => {
        if (++calls === 2) throw new Error("boom");
        return be.api.createMandays(id, b);
      },
    };
    const err = await runOps(buildOps([], [draft]), api).catch((e) => e);
    expect(err).toBeInstanceOf(CommitError);
    expect(err.done).toBe(2);
    expect(err.total).toBe(3);
    expect(err.created.size).toBe(1);
  });
});
