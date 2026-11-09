import { isRole, ROLE_LABEL } from "@/shared/config/roles";
import type { ProjectDetail } from "@/entities/project";

export type TeamRow = { id: number; name: string; role: string; total: number; assets: { name: string; md: number }[] };

/** Anggota tim + mandays-nya di proyek ini (jumlah allocated_mandays dari trx_mandays per pentester). */
export function teamRows(p: ProjectDetail): TeamRow[] {
  return p.resources.map((r) => {
    const uid = r.user?.sys_user?.sys_user_id ?? r.user?.sys_user_id;
    const role = r.user?.sys_user?.role?.role_name;
    const mine = p.mandays.filter((m) => m.pentester_id === uid);
    return {
      id: r.resource_id,
      name: r.user?.full_name ?? `User ${r.user_id}`,
      role: isRole(role) ? ROLE_LABEL[role] : (role ?? ""),
      total: mine.reduce((n, m) => n + m.allocated_mandays, 0),
      assets: mine.map((m) => ({ name: m.asset?.asset_name ?? `Aset ${m.asset_id}`, md: m.allocated_mandays })),
    };
  });
}

export function TeamSidebar({ project }: { project: ProjectDetail }) {
  const rows = teamRows(project);
  return (
    <aside aria-labelledby="team" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5 lg:sticky lg:top-0">
      <h2 id="team" className="text-title-md text-ink">Tim & mandays <span className="text-body-sm text-ink-muted">({rows.length})</span></h2>
      {rows.length === 0 ? <p className="text-body-sm text-ink-muted">Belum ada anggota.</p> : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 py-3">
              <span className="flex items-start justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-title-sm text-ink">{r.name}</span>
                  <span className="text-caption text-ink-muted">{r.role}</span>
                </span>
                <span className="text-body-sm text-ink-secondary tabular">{r.assets.length > 0 ? `${r.total} md` : "-"}</span>
              </span>
              {r.assets.map((a) => (
                <span key={a.name} className="flex justify-between gap-2 text-caption text-ink-muted">
                  <span className="truncate">{a.name}</span>
                  <span className="tabular">{a.md} md</span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
