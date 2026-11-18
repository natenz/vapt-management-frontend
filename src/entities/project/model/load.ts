import type { ProjectDetail } from "./types";

export type ResourceProject = {
  id: number;
  name: string;
  status?: string;
  mandays?: number;
};

export type ResourceLoad = { mandays: number; projects: ResourceProject[] };

/** Bulan kalender "YYYY-MM". */
export const currentMonth = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

export const monthLabel = (ym: string) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${ym}-01T00:00:00`));

const dayNo = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
};

/**
 * Bagian mandays sebuah penugasan yang jatuh di bulan `ym`: allocated_mandays dibagi rata per hari kalender
 * dari start_date..end_date, lalu diambil hari-hari di bulan itu.
 * ponytail: akhir pekan ikut dihitung sebagai hari; kalau perlu hari kerja saja, ganti pembagi dan penyebutnya.
 */
export function mandaysInMonth(m: { start_date?: string | null; end_date?: string | null; allocated_mandays: number }, ym: string): number {
  if (!m.start_date || !m.end_date) return 0; // BE mewajibkan keduanya; tanpa tanggal tidak bisa dibagi ke bulan
  const s = dayNo(m.start_date);
  const e = Math.max(s, dayNo(m.end_date));
  const [y, mo] = ym.split("-").map(Number);
  const first = Date.UTC(y!, mo! - 1, 1) / 86_400_000;
  const last = Date.UTC(y!, mo!, 0) / 86_400_000;
  const overlap = Math.min(e, last) - Math.max(s, first) + 1;
  return overlap > 0 ? (m.allocated_mandays * overlap) / (e - s + 1) : 0;
}

/**
 * Beban tiap orang pada bulan `ym` (default bulan ini). Mandays = porsi penugasan trx_mandays di bulan itu,
 * proyek Done tetap dihitung karena kapasitasnya sudah terpakai. Daftar proyek hanya yang BELUM Done
 * (trx_resource, atau pm_id untuk PM). Kunci = sys_user_id.
 */
export function aggregateLoad(details: ProjectDetail[], ym: string = currentMonth()): Record<number, ResourceLoad> {
  const out: Record<number, ResourceLoad> = {};
  const at = (uid: number) => (out[uid] ??= { mandays: 0, projects: [] });
  const join = (uid: number, p: ProjectDetail, md = 0) => {
    const l = at(uid);
    const existing = l.projects.find((x) => x.id === p.project_id);
    if (!existing) {
      l.projects.push({
        id: p.project_id,
        name: p.project_name,
        ...(p.status?.status_name ? { status: p.status.status_name } : {}),
        ...(md > 0 ? { mandays: Math.round(md * 100) / 100 } : {}),
      });
    } else if (md > 0) {
      existing.mandays = Math.round(((existing.mandays ?? 0) + md) * 100) / 100;
    }
  };
  for (const p of details) {
    const done = p.status?.status_name === "Done";
    if (!done) {
      if (p.pm_id) join(p.pm_id, p);
      for (const r of p.resources) {
        const uid = r.user?.sys_user?.sys_user_id ?? r.user?.sys_user_id;
        if (uid != null) join(uid, p);
      }
    }
    for (const m of p.mandays) {
      const md = mandaysInMonth(m, ym);
      if (done && md === 0) continue; // proyek Done yang tidak menyentuh bulan ini tidak perlu muncul
      at(m.pentester_id).mandays += md;
      if (!done) join(m.pentester_id, p, md);
    }
  }
  for (const l of Object.values(out)) l.mandays = Math.round(l.mandays * 100) / 100;
  return out;
}
