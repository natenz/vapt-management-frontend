import type { ProjectDetail } from "./types";

export type ResourceLoad = { mandays: number; projects: { id: number; name: string }[] };

/**
 * Beban tiap orang dari detail proyek yang BELUM Done: total allocated_mandays (trx_mandays) per pentester,
 * dan proyek yang diikuti (trx_resource). Kunci = sys_user_id. Writer tidak punya mandays, hanya proyek.
 */
export function aggregateLoad(details: ProjectDetail[]): Record<number, ResourceLoad> {
  const out: Record<number, ResourceLoad> = {};
  const touch = (uid: number, p: ProjectDetail) => {
    const l = (out[uid] ??= { mandays: 0, projects: [] });
    if (!l.projects.some((x) => x.id === p.project_id)) l.projects.push({ id: p.project_id, name: p.project_name });
    return l;
  };
  for (const p of details) {
    if (p.status?.status_name === "Done") continue;
    for (const r of p.resources) {
      const uid = r.user?.sys_user?.sys_user_id ?? r.user?.sys_user_id;
      if (uid != null) touch(uid, p);
    }
    for (const m of p.mandays) touch(m.pentester_id, p).mandays += m.allocated_mandays;
  }
  for (const l of Object.values(out)) l.mandays = Math.round(l.mandays * 100) / 100;
  return out;
}
