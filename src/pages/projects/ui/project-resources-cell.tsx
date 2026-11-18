import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";
import { useState } from "react";
import { listResources, type Project, type Resource } from "@/entities/project";
import { ROLE_LABEL, type RoleName } from "@/shared/config/roles";
import { cn } from "@/shared/lib/cn";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

function formatRoleLabel(roleName?: string | null): string {
  if (!roleName) return "Anggota Tim";
  const normalized = roleName.toLowerCase().replace(/\s+/g, "_") as RoleName;
  if (ROLE_LABEL[normalized]) return ROLE_LABEL[normalized];
  if (roleName.toLowerCase() === "tech_writer" || roleName.toLowerCase() === "tech writer") {
    return "Tech Writer";
  }
  return roleName
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface ProjectResourcesCellProps {
  project: Project;
  currentUserId?: number;
  includePm?: boolean;
}

export function ProjectResourcesCell({
  project,
  currentUserId,
  includePm = false,
}: ProjectResourcesCellProps) {
  const [open, setOpen] = useState(false);

  // Jika data project sudah membawa resources (misal dari mock atau preloaded), gunakan langsung
  const preloadedResources = (project as { resources?: Resource[] }).resources;

  const { data: fetchedResources, isLoading } = useQuery<Resource[]>({
    queryKey: ["projects", project.project_id, "resources"],
    queryFn: () => listResources(project.project_id),
    staleTime: 60_000,
    enabled: !preloadedResources,
    initialData: preloadedResources,
  });

  const rawResources: Resource[] = preloadedResources ?? fetchedResources ?? [];

  // Data PM jika includePm aktif (untuk superadmin, tech lead, tech writer, pentester)
  const pmUser = project.pm;
  const pmEntry =
    includePm && pmUser
      ? {
          id: `pm-${pmUser.sys_user_id}`,
          fullName: pmUser.profile?.full_name ?? pmUser.username ?? "Project Manager",
          username: pmUser.username ?? "pm",
          roleLabel: "Project Manager",
          initials:
            (pmUser.profile?.full_name ?? pmUser.username ?? "PM")
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("") || "PM",
        }
      : null;

  // Filter profil anggota tim
  const otherFiltered = rawResources.filter((r) => {
    const uid = r.user?.sys_user?.sys_user_id ?? r.user?.sys_user_id;
    // Jika tidak include PM (khusus role PM), sembunyikan user login sendiri / PM
    if (!includePm && currentUserId && uid === currentUserId) return false;
    // Jika include PM, cegah duplikasi jika PM sudah terdaftar di pmEntry
    if (includePm && pmUser && uid === pmUser.sys_user_id) return false;
    return true;
  });

  // Deduplikasi anggota berdasarkan ID pengguna
  const uniqueOther = Array.from(
    new Map(
      otherFiltered.map((r) => {
        const id = r.user?.sys_user?.sys_user_id ?? r.user?.user_id ?? r.user_id;
        return [id, r];
      }),
    ).values(),
  ).map((r) => {
    const fullName =
      r.user?.full_name ??
      r.user?.sys_user?.profile?.full_name ??
      r.user?.sys_user?.username ??
      "Anggota";
    const username =
      r.user?.sys_user?.username ??
      r.user?.full_name?.toLowerCase().replace(/\s+/g, ".") ??
      "user";
    const roleName = r.user?.sys_user?.role?.role_name;
    const roleLabel = formatRoleLabel(roleName);
    const initials =
      fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "U";

    return {
      id: r.resource_id,
      fullName,
      username,
      roleLabel,
      initials,
    };
  });

  // Gabungkan PM di posisi paling awal jika includePm bernilai true
  const combinedResources = pmEntry ? [pmEntry, ...uniqueOther] : uniqueOther;

  if (isLoading && !preloadedResources) {
    return (
      <div className="flex items-center -space-x-1.5 py-1">
        <div className="size-6 rounded-full bg-surface-subtle animate-pulse" />
        <div className="size-6 rounded-full bg-surface-subtle animate-pulse" />
      </div>
    );
  }

  if (combinedResources.length === 0) {
    return <span className="text-caption text-ink-muted">-</span>;
  }

  const maxDisplay = 3;
  const displayAvatars = combinedResources.slice(0, maxDisplay);
  const remainingCount = combinedResources.length - maxDisplay;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={cn(
            "group inline-flex items-center gap-2 rounded-xs px-1.5 py-1 text-left",
            "transition-colors duration-150 hover:bg-surface-subtle focus-ring",
          )}
          aria-label="Lihat detail resource proyek"
        >
          {/* Avatar stack */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {displayAvatars.map((r, i) => (
              <Avatar
                key={r.id ?? i}
                size="sm"
                className="size-6 text-[10px] shrink-0 border-2 border-surface"
                title={`${r.fullName} (${r.roleLabel})`}
              >
                <AvatarFallback className="text-[10px] font-normal bg-surface-subtle text-ink">
                  {r.initials}
                </AvatarFallback>
              </Avatar>
            ))}
            {remainingCount > 0 ? (
              <span className="flex size-6 items-center justify-center rounded-full border-2 border-surface bg-surface-subtle text-[9px] font-normal text-ink-muted">
                +{remainingCount}
              </span>
            ) : null}
          </div>

          {/* Action yang muncul saat hover cell */}
          <span className="inline-flex items-center gap-0.5 rounded-xs border border-border bg-surface px-1.5 py-0.5 text-[11px] font-normal text-ink-secondary shadow-xs opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
            <span>Detail</span>
            <ChevronRight className="size-3 text-ink-muted" aria-hidden />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-80 sm:w-96 p-3 shadow-raised",
          "transition-all duration-200 ease-out",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        )}
      >
        <div className="flex flex-col gap-2">
          {/* Header Popover */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Users className="size-4 text-ink-muted" aria-hidden />
              <span className="text-body-sm font-medium text-ink">Resources Proyek</span>
              <span className="rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10px] font-normal text-ink-muted">
                {combinedResources.length}
              </span>
            </div>
            <PopoverClose className="size-7 text-ink-muted hover:text-ink -mr-1" />
          </div>

          {/* Mini Tabel Sederhana (tanpa DataTable) */}
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-border text-[11px] font-normal text-ink-muted normal-case">
                  <th className="py-1.5 pl-1 pr-2 font-normal">Profil</th>
                  <th className="py-1.5 px-2 font-normal">Pengguna</th>
                  <th className="py-1.5 pr-1 pl-2 font-normal">Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {combinedResources.map((r, idx) => (
                  <tr
                    key={r.id ?? idx}
                    className="hover:bg-surface-subtle/70 transition-colors duration-150"
                  >
                    {/* Logo Profil */}
                    <td className="py-2 pl-1 pr-2">
                      <Avatar size="sm" className="size-6 text-[10px] shrink-0">
                        <AvatarFallback className="text-[10px] font-normal bg-surface-subtle text-ink">
                          {r.initials}
                        </AvatarFallback>
                      </Avatar>
                    </td>

                    {/* Nama dan Username */}
                    <td className="py-2 px-2 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="text-body-sm font-normal text-ink truncate">
                          {r.fullName}
                        </span>
                        <span className="text-[11px] text-ink-muted truncate">@{r.username}</span>
                      </div>
                    </td>

                    {/* Peran */}
                    <td className="py-2 pr-1 pl-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-normal bg-surface-subtle text-ink-secondary border border-border/50">
                        {r.roleLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
