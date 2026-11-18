import { ArrowUpRight, FolderKanban } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { getProjectStatusStyle, type ResourceProject } from "@/entities/project";
import type { User } from "@/entities/user";
import { cn } from "@/shared/lib/cn";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface ResourceProjectsCellProps {
  user: User;
  projects: readonly ResourceProject[];
}

export function ResourceProjectsCell({ user, projects }: ResourceProjectsCellProps) {
  const [open, setOpen] = useState(false);

  if (projects.length === 0) {
    return <span className="text-ink-muted">-</span>;
  }

  const maxVisible = 2;
  const visibleProjects = projects.slice(0, maxVisible);
  const remainingCount = projects.length - maxVisible;
  const userName = user.profile?.full_name || user.username || "Pengguna";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleProjects.map((p) => (
        <Link
          key={p.id}
          to={`/projects/${p.id}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xs border-0 px-2 py-0.5 text-xs font-normal",
            "bg-project-chip-bg text-project-chip-fg max-w-[130px] sm:max-w-[150px]",
            "transition-opacity duration-150 hover:opacity-80 focus-ring",
          )}
          title={p.name}
        >
          <FolderKanban className="size-3 shrink-0 opacity-70" aria-hidden="true" />
          <span className="truncate">{p.name}</span>
        </Link>
      ))}

      {remainingCount > 0 ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "inline-flex items-center gap-1 rounded-xs border border-border bg-surface-subtle px-1.5 py-0.5 text-xs font-normal text-ink-secondary",
                "transition-colors duration-150 hover:bg-surface-muted hover:text-ink focus-ring cursor-pointer",
              )}
              aria-label={`Lihat semua ${projects.length} proyek aktif`}
            >
              <span>+{remainingCount} lainnya</span>
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
            <div className="flex flex-col gap-2.5">
              {/* Header Popover */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-xs bg-brand/10 text-brand shrink-0">
                    <FolderKanban className="size-4" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-body-sm font-medium text-ink truncate">
                      Proyek Aktif
                    </span>
                    <span className="text-[11px] text-ink-muted truncate">
                      {userName} · {projects.length} proyek
                    </span>
                  </div>
                </div>
                <PopoverClose className="size-7 text-ink-muted hover:text-ink -mr-1" />
              </div>

              {/* List Proyek */}
              <div className="max-h-64 overflow-y-auto divide-y divide-border/60 -mx-1 px-1">
                {projects.map((p) => {
                  const statusStyle = getProjectStatusStyle(p.status);
                  const StatusIcon = statusStyle.icon;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2.5 py-2 px-1.5 rounded-xs hover:bg-surface-subtle/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "inline-flex size-6 shrink-0 items-center justify-center rounded-xs",
                            statusStyle.className,
                          )}
                          title={p.status ?? "Status Proyek"}
                          aria-hidden="true"
                        >
                          <StatusIcon className="size-3.5" />
                        </span>
                        <div className="flex flex-col min-w-0">
                          <Link
                            to={`/projects/${p.id}`}
                            className="text-body-sm font-normal text-ink hover:text-brand hover:underline truncate focus-ring"
                            title={p.name}
                          >
                            {p.name}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                            <span>{p.status ?? "Aktif"}</span>
                            {p.mandays != null && p.mandays > 0 ? (
                              <>
                                <span>·</span>
                                <span className="tabular-nums font-medium text-ink-secondary">
                                  {p.mandays} MD
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <Link
                        to={`/projects/${p.id}`}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-xs text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors focus-ring"
                        aria-label={`Buka detail ${p.name}`}
                        title="Buka detail proyek"
                      >
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
