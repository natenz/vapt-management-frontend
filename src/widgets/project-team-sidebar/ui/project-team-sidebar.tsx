import { isRole, ROLE_LABEL } from "@/shared/config/roles";
import type { ProjectDetail } from "@/entities/project";
import { UserProfilePopover, toUserProfileInfo } from "@/entities/user";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";

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

export function ProjectTeamSidebar({ project }: { project: ProjectDetail }) {
  const rows = teamRows(project);
  return (
    <aside aria-labelledby="team" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5 lg:sticky lg:top-0">
      <h2 id="team" className="text-title-md text-ink">Tim & mandays <span className="text-body-sm text-ink-muted">({rows.length})</span></h2>
      {rows.length === 0 ? <p className="text-body-sm text-ink-muted">Belum ada anggota.</p> : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((r) => {
            const resource = project.resources.find((res) => res.resource_id === r.id);
            const userProfile = toUserProfileInfo(
              resource?.user?.sys_user ?? {
                sys_user_id: resource?.user_id,
                profile: { user_id: resource?.user_id ?? 0, full_name: r.name },
              },
              r.name,
            );
            return (
              <li key={r.id} className="flex flex-col gap-1 py-3">
                <span className="flex items-start justify-between gap-2">
                  <UserProfilePopover user={userProfile}>
                    <button
                      type="button"
                      className="group flex items-start gap-2.5 text-left rounded-xs p-1 -ml-1 hover:bg-surface-subtle focus-ring transition-colors"
                      aria-label={`Lihat profil ${r.name}`}
                    >
                      <Avatar size="sm" className="size-7 text-[10px] shrink-0 border border-border mt-0.5">
                        <AvatarFallback className="text-[10px] font-normal bg-surface-subtle text-ink">
                          {userProfile.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex flex-col min-w-0">
                        <span className="text-title-sm text-ink truncate group-hover:text-brand transition-colors">
                          {r.name}
                        </span>
                        <span className="text-caption text-ink-muted truncate">
                          {r.role || "Anggota Tim"}
                        </span>
                      </span>
                    </button>
                  </UserProfilePopover>
                  <span className="text-body-sm text-ink-secondary tabular shrink-0 pt-1">
                    {r.assets.length > 0 ? `${r.total} md` : "-"}
                  </span>
                </span>
                {r.assets.map((a) => (
                  <span key={a.name} className="flex justify-between gap-2 text-caption text-ink-muted pl-9">
                    <span className="truncate">{a.name}</span>
                    <span className="tabular shrink-0">{a.md} md</span>
                  </span>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
