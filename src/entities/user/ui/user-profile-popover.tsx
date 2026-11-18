import {
  Building2,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { RoleBadge } from "./role-badge";

export interface UserProfileInfo {
  id?: string | number;
  name: string;
  username?: string;
  role?: string;
  email?: string;
  phone?: string;
  department?: string;
  initials: string;
}

export function toUserProfileInfo(
  user?: {
    sys_user_id?: number | null;
    username?: string | null;
    email?: string | null;
    role?: { role_name?: string | null } | null;
    profile?: {
      user_id?: number | null;
      full_name?: string | null;
      department?: string | null;
      phone_number?: string | null;
    } | null;
  } | null,
  fallbackName = "-",
): UserProfileInfo {
  const name = user?.profile?.full_name?.trim() || user?.username?.trim() || fallbackName;
  const username = user?.username?.trim() || undefined;
  const role = user?.role?.role_name || undefined;
  const email = user?.email?.trim() || undefined;
  const phone = user?.profile?.phone_number?.trim() || undefined;
  const department = user?.profile?.department?.trim() || undefined;
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  return {
    id: user?.sys_user_id ?? undefined,
    name,
    username,
    role,
    email,
    phone,
    department,
    initials,
  };
}

export interface UserProfilePopoverProps {
  user: UserProfileInfo;
  children: ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

/**
 * Popover profil pengguna mandiri yang menampilkan avatar, nama, role badge,
 * serta detail kontak (email, departemen, nomor telepon) saat diklik.
 */
export function UserProfilePopover({
  user,
  children,
  align = "start",
  sideOffset = 6,
  className,
}: UserProfilePopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        onClick={(e) => e.stopPropagation()}
        className={cn("w-72 p-3.5 shadow-raised", className)}
      >
        <div className="flex flex-col gap-3">
          {/* Header Popover Profil */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <Avatar size="md" className="shrink-0 border border-border">
                <AvatarFallback className="font-normal bg-surface-subtle text-ink">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-body-sm font-medium text-ink truncate" title={user.name}>
                  {user.name}
                </span>
                {user.username ? (
                  <span className="text-[11px] text-ink-muted truncate">@{user.username}</span>
                ) : null}
                {user.role ? <RoleBadge role={user.role} className="mt-1" /> : null}
              </div>
            </div>
            <PopoverClose className="size-6 -mr-1 -mt-0.5 text-ink-muted hover:text-ink" />
          </div>

          {/* Info Kontak & Departemen */}
          {user.department || user.email || user.phone ? (
            <div className="flex flex-col gap-1.5 border-t border-border pt-2 text-caption text-ink-secondary">
              {user.department ? (
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="truncate" title={user.department}>
                    {user.department}
                  </span>
                </div>
              ) : null}
              {user.email ? (
                <div className="flex items-center gap-2 truncate">
                  <Mail className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="truncate" title={user.email}>
                    {user.email}
                  </span>
                </div>
              ) : null}
              {user.phone ? (
                <div className="flex items-center gap-2 truncate">
                  <Phone className="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="truncate" title={user.phone}>
                    {user.phone}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface TeamResourcesPopoverProps {
  members: UserProfileInfo[];
  children: ReactNode;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

/**
 * Popover daftar profil anggota tim proyek yang menampilkan daftar anggota,
 * avatar, username, dan peran masing-masing saat avatar stack diklik.
 */
export function TeamResourcesPopover({
  members,
  children,
  align = "start",
  sideOffset = 6,
  className,
}: TeamResourcesPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        onClick={(e) => e.stopPropagation()}
        className={cn("w-80 sm:w-88 p-3.5 shadow-raised", className)}
      >
        <div className="flex flex-col gap-2.5">
          {/* Header Popover Tim */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <Users className="size-4 text-ink-muted" aria-hidden="true" />
              <span className="text-body-sm font-medium text-ink">Anggota Tim Proyek</span>
              <span className="rounded-full bg-surface-subtle px-1.5 py-0.5 text-[10px] font-normal text-ink-muted">
                {members.length}
              </span>
            </div>
            <PopoverClose className="size-6 -mr-1 text-ink-muted hover:text-ink" />
          </div>

          {/* Daftar Anggota */}
          <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
            {members.length === 0 ? (
              <p className="py-3 text-center text-caption text-ink-muted">Belum ada anggota tim.</p>
            ) : (
              members.map((m, idx) => (
                <div
                  key={m.id ?? idx}
                  className="flex items-center justify-between gap-2.5 py-2 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar size="sm" className="size-6 text-[10px] shrink-0 border border-border">
                      <AvatarFallback className="text-[10px] font-normal bg-surface-subtle text-ink">
                        {m.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-body-sm font-normal text-ink truncate" title={m.name}>
                        {m.name}
                      </span>
                      {m.username ? (
                        <span className="text-[11px] text-ink-muted truncate">@{m.username}</span>
                      ) : null}
                    </div>
                  </div>
                  {m.role ? <RoleBadge role={m.role} className="shrink-0" /> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
