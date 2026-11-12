import { z } from "zod";
import type { ProjectDetail } from "@/entities/project";

export const ASSET_TYPES = ["web", "api", "mobile", "network"];

// md: kosong = otomatis (sisa mandays aset dibagi rata ke baris otomatis); terisi = angka manual dari PM.
export type DraftPentester = { key: string; mandaysId?: number; pentesterId: number | null; start: string; end: string; md: string };
export type DraftAsset = {
  key: string;
  id?: number; // ada = sudah tersimpan di BE
  name: string;
  type: string;
  domain: string;
  ip: string;
  mandays: string; // string supaya bisa diketik bebas; diparse saat validasi
  pentesters: DraftPentester[];
  removed?: boolean; // aset tersimpan yang akan dihapus saat "Simpan"
};

const day = (s?: string | null) => (s ?? "").slice(0, 10);
let seq = 0;
export const newKey = () => `k${++seq}`;

/** Snapshot BE -> draft. Pentester per aset diambil dari baris trx_mandays. */
export function fromServer(p: ProjectDetail): DraftAsset[] {
  return p.assets.map((a) => ({
    key: `a${a.assets_id}`,
    id: a.assets_id,
    name: a.asset_name,
    type: a.asset_type,
    domain: a.domain ?? "",
    ip: a.ip_address ?? "",
    mandays: String(a.mandays),
    pentesters: rowsOf(p, a),
  }));
}

function rowsOf(p: ProjectDetail, a: ProjectDetail["assets"][number]): DraftPentester[] {
  const rows = p.mandays.filter((m) => m.asset_id === a.assets_id).sort((x, y) => x.mandays_id - y.mandays_id);
  const even = splitMandays(a.mandays, rows.length);
  // Otomatis hanya jika SEMUA baris persis pembagian rata; campuran dianggap manual supaya angka server tidak berubah diam-diam.
  const auto = rows.every((m, i) => Math.round(m.allocated_mandays * 100) === Math.round(even[i]! * 100));
  return rows.map((m) => ({
    key: `m${m.mandays_id}`,
    mandaysId: m.mandays_id,
    pentesterId: m.pentester_id,
    start: day(m.start_date),
    end: day(m.end_date),
    md: auto ? "" : String(m.allocated_mandays),
  }));
}

/**
 * Bagi `total` md ke `n` pentester, presisi 0,01 (kolom BE numeric(8,2)). Sisa sen jatuh ke yang pertama,
 * jadi jumlahnya selalu persis `total`: 20 / 3 => [6.67, 6.67, 6.66].
 */
export function splitMandays(total: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const rest = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < rest ? 1 : 0)) / 100);
}

/**
 * Mandays tiap pentester. Baris dengan `md` terisi = manual. Sisanya (total - jumlah manual) dibagi rata ke baris otomatis.
 * Semua hitungan dalam sen (bilangan bulat) agar tidak kena pembulatan float. `remaining` < 0 berarti melebihi mandays aset.
 */
export function allocate(total: number, rows: { md: string }[]): { shares: number[]; remaining: number; autoStarved: boolean } {
  const cents = total > 0 && Number.isFinite(total) ? Math.round(total * 100) : 0;
  const manual = rows.map((r) => (r.md.trim() === "" ? null : Math.round(Number(r.md) * 100)));
  const val = (m: number | null) => (m != null && Number.isFinite(m) ? m : 0);
  const used = manual.reduce<number>((s, m) => s + val(m), 0);
  const autoCount = manual.filter((m) => m == null).length;
  const rest = Math.max(0, cents - used);
  const base = autoCount ? Math.floor(rest / autoCount) : 0;
  const extra = autoCount ? rest - base * autoCount : 0;
  let seen = 0;
  const shares = manual.map((m) => (m != null ? val(m) : base + (seen++ < extra ? 1 : 0)));
  const allocated = shares.reduce((s, x) => s + x, 0);
  return { shares: shares.map((c) => c / 100), remaining: (cents - allocated) / 100, autoStarved: autoCount > 0 && rest <= 0 };
}

const fmtNum = (n: number) => String(Math.round(n * 100) / 100);
export const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

export type Range = { start?: string | null; end?: string | null };

/** Pesan salah per aset (Indonesia). Kosong = valid. Aset yang akan dihapus tidak divalidasi. */
export function validate(drafts: DraftAsset[], range: Range, server: DraftAsset[] = []): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const lo = day(range.start);
  const hi = day(range.end);
  for (const a of drafts) {
    if (a.removed) continue;
    const e: string[] = [];
    const label = a.name.trim() || "Aset baru";
    if (!a.name.trim()) e.push("Nama aset wajib diisi.");
    if (a.name.trim().length > 255) e.push("Nama aset maksimal 255 karakter.");
    if (!ASSET_TYPES.includes(a.type)) e.push("Pilih tipe aset.");
    if (a.domain.trim().length > 255) e.push("Domain maksimal 255 karakter.");
    const ip = a.ip.trim();
    if (ip && !z.ipv4().safeParse(ip).success && !z.ipv6().safeParse(ip).success)
      e.push("IP address tidak valid (contoh: 192.168.1.1).");
    // Batasan BE: PUT /assets/:id menolak ip_address kosong, jadi IP yang sudah tersimpan tidak bisa dikosongkan.
    if (a.id != null && !ip && server.find((s) => s.id === a.id)?.ip.trim())
      e.push("IP address yang sudah tersimpan tidak bisa dikosongkan (batasan backend). Ganti dengan IP lain, atau hapus dan buat ulang asetnya.");
    const md = num(a.mandays);
    if (!(md > 0)) e.push("Mandays aset harus lebih dari 0.");
    const seen = new Set<number>();
    a.pentesters.forEach((p, i) => {
      const who = `Pentester ${i + 1}`;
      if (p.pentesterId == null) e.push(`${who}: pilih pentester.`);
      else if (seen.has(p.pentesterId)) e.push(`${who}: pentester yang sama sudah ditugaskan di aset ini.`);
      else seen.add(p.pentesterId);
      if (!p.start || !p.end) e.push(`${who}: tanggal mulai dan selesai wajib diisi.`);
      else if (p.end < p.start) e.push(`${who}: tanggal selesai tidak boleh sebelum tanggal mulai.`);
      else if ((lo && p.start < lo) || (hi && p.end > hi))
        e.push(`${who}: jadwal harus di dalam rentang proyek (${lo || "?"} s.d. ${hi || "?"}).`);
      if (p.md.trim() !== "") {
        const v = Number(p.md);
        if (!(v > 0)) e.push(`${who}: mandays harus lebih dari 0 (kosongkan untuk otomatis).`);
        else if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6)
          e.push(`${who}: mandays maksimal 2 angka di belakang koma.`);
      }
    });
    if (md > 0 && a.pentesters.length > 0) {
      const r = allocate(md, a.pentesters);
      if (r.remaining < 0) e.push(`Total mandays pentester (${fmtNum(md - r.remaining)} md) melebihi mandays aset (${fmtNum(md)} md).`);
      else if (r.autoStarved)
        e.push("Tidak ada sisa mandays untuk pentester yang diatur otomatis. Kurangi angka manual atau isi semuanya manual.");
    }
    if (e.length) out[a.key] = e.map((m) => `${label}: ${m}`);
  }
  return out;
}

// ---------- rencana simpan ke BE ----------

export type AssetRef = { id: number } | { key: string };
// ip_address opsional: BE memvalidasi `ip` pada string kosong di PUT (field pointer), jadi kosong = tidak dikirim.
export type AssetBody = { asset_name: string; asset_type: string; mandays: number; domain: string; ip_address?: string };
export type Op =
  | { t: "asset.delete"; id: number }
  | { t: "asset.create"; key: string; body: AssetBody }
  | { t: "asset.update"; id: number; body: AssetBody }
  | { t: "mandays.delete"; id: number }
  | { t: "mandays.update"; id: number; body: { pentester_id: number; start_date: string; end_date: string; allocated_mandays: number } }
  | { t: "mandays.create"; asset: AssetRef; body: { pentester_id: number; start_date: string; end_date: string; allocated_mandays: number } };

const body = (a: DraftAsset): AssetBody => ({
  asset_name: a.name.trim(),
  asset_type: a.type,
  mandays: num(a.mandays),
  domain: a.domain.trim(),
  ip_address: a.ip.trim() || undefined,
});
const sameBody = (x: AssetBody, y: AssetBody) =>
  x.asset_name === y.asset_name &&
  x.asset_type === y.asset_type &&
  x.mandays === y.mandays &&
  x.domain === y.domain &&
  (x.ip_address ?? "") === (y.ip_address ?? "");

/**
 * Selisih snapshot BE (`server`) vs draft -> daftar operasi berurutan. Urutan memenuhi aturan BE:
 *  - total mandays pentester per aset tidak boleh melebihi mandays aset,
 *  - mandays aset tidak boleh di bawah total yang sudah dialokasikan.
 * Maka: kuota naik dulu, hapus baris, ubah baris, buat baris baru, dan kuota turun paling akhir.
 * Pentester yang berubah jumlahnya membuat share baris otomatis dihitung ulang; baris manual dikirim apa adanya.
 */
export function buildOps(server: DraftAsset[], drafts: DraftAsset[]): Op[] {
  const byId = new Map(server.filter((a) => a.id != null).map((a) => [a.id!, a]));
  const dels: Op[] = [],
    creates: Op[] = [],
    upUp: Op[] = [],
    rowDel: Op[] = [],
    rowNew: Op[] = [],
    upDown: Op[] = [];
  const rowUp: { op: Op; delta: number }[] = [];

  for (const a of drafts) {
    if (a.removed) {
      if (a.id != null) dels.push({ t: "asset.delete", id: a.id });
      continue;
    }
    const b = body(a);
    const old = a.id != null ? byId.get(a.id) : undefined;
    const ref: AssetRef = a.id != null ? { id: a.id } : { key: a.key };
    if (!old) creates.push({ t: "asset.create", key: a.key, body: b });
    else {
      const ob = body(old);
      if (!sameBody(ob, b)) (b.mandays < ob.mandays ? upDown : upUp).push({ t: "asset.update", id: a.id!, body: b });
    }
    const shares = allocate(b.mandays, a.pentesters).shares;
    const prevShares = old ? allocate(num(old.mandays), old.pentesters).shares : [];
    const oldRows = new Map((old?.pentesters ?? []).filter((p) => p.mandaysId != null).map((p) => [p.mandaysId!, p]));
    const keep = new Set<number>();
    a.pentesters.forEach((p, i) => {
      const rowBody = { pentester_id: p.pentesterId!, start_date: p.start, end_date: p.end, allocated_mandays: shares[i]! };
      const prev = p.mandaysId != null ? oldRows.get(p.mandaysId) : undefined;
      if (!prev) {
        rowNew.push({ t: "mandays.create", asset: ref, body: rowBody });
        return;
      }
      keep.add(p.mandaysId!);
      const prevShare = prevShares[old!.pentesters.findIndex((x) => x.mandaysId === p.mandaysId)]!;
      if (
        prev.pentesterId !== p.pentesterId ||
        prev.start !== p.start ||
        prev.end !== p.end ||
        prevShare !== rowBody.allocated_mandays
      ) {
        rowUp.push({
          op: { t: "mandays.update", id: p.mandaysId!, body: rowBody },
          delta: rowBody.allocated_mandays - prevShare,
        });
      }
    });
    for (const id of oldRows.keys()) if (!keep.has(id)) rowDel.push({ t: "mandays.delete", id });
  }

  // Update yang MENURUNKAN jatah jalan dulu, baru yang menaikkan: total per aset tidak pernah melewati kuota di tengah jalan (mis. 5/6 -> 6/5).
  const ups = rowUp.sort((x, y) => x.delta - y.delta).map((x) => x.op);
  return [...dels, ...creates, ...upUp, ...rowDel, ...ups, ...rowNew, ...upDown];
}

export type PlanApi = {
  createAsset: (b: AssetBody) => Promise<{ assets_id: number }>;
  updateAsset: (id: number, b: AssetBody) => Promise<unknown>;
  deleteAsset: (id: number) => Promise<unknown>;
  createMandays: (assetId: number, b: { pentester_id: number; start_date: string; end_date: string; allocated_mandays: number }) => Promise<unknown>;
  updateMandays: (id: number, b: { pentester_id: number; start_date: string; end_date: string; allocated_mandays: number }) => Promise<unknown>;
  deleteMandays: (id: number) => Promise<unknown>;
};

export class CommitError extends Error {
  constructor(readonly cause: unknown, readonly created: Map<string, number>, readonly done: number, readonly total: number) {
    super(cause instanceof Error ? cause.message : "Gagal menyimpan");
  }
}

/** Jalankan berurutan. Berhenti di error pertama; `created` memetakan draft baru -> id BE supaya coba-ulang tidak menggandakan aset. */
export async function runOps(ops: Op[], api: PlanApi): Promise<Map<string, number>> {
  const created = new Map<string, number>();
  for (const [i, op] of ops.entries()) {
    try {
      if (op.t === "asset.create") created.set(op.key, (await api.createAsset(op.body)).assets_id);
      else if (op.t === "asset.update") await api.updateAsset(op.id, op.body);
      else if (op.t === "asset.delete") await api.deleteAsset(op.id);
      else if (op.t === "mandays.delete") await api.deleteMandays(op.id);
      else if (op.t === "mandays.update") await api.updateMandays(op.id, op.body);
      else {
        const id = "id" in op.asset ? op.asset.id : created.get(op.asset.key);
        if (id == null) throw new Error("Aset baru belum tersimpan");
        await api.createMandays(id, op.body);
      }
    } catch (e) {
      throw new CommitError(e, created, i, ops.length);
    }
  }
  return created;
}
