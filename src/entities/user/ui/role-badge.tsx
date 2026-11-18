import type { LucideIcon } from "lucide-react";
import {
  Bug,
  FileText,
  FolderKanban,
  Lock,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface RoleConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  pentester: {
    label: "Pentester",
    icon: Bug,
    className: "bg-purple-50 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300",
  },
  technical_writer: {
    label: "Tech Writer",
    icon: FileText,
    className: "bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  },
  tech_writer: {
    label: "Tech Writer",
    icon: FileText,
    className: "bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  },
  project_manager: {
    label: "Project Manager",
    icon: FolderKanban,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  tech_lead: {
    label: "Tech Lead",
    icon: ShieldCheck,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  super_admin: {
    label: "Superadmin",
    icon: Lock,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  },
  superadmin: {
    label: "Superadmin",
    icon: Lock,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  },
};

function normalizeRole(role?: string | null): string {
  if (!role) return "";
  return role.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

export interface RoleBadgeProps {
  role?: string | null;
  className?: string;
}

/**
 * Badge role pengguna dengan gaya status proyek (chip ikon pastel borderless + nama role di luar chip).
 * Mengikuti pola yang sama persis dengan ProjectStatusBadge untuk konsistensi visual sistem.
 */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  const key = normalizeRole(role);
  const config = ROLE_CONFIG[key] ?? {
    label: role || "-",
    icon: Shield,
    className: "bg-surface-subtle text-ink-secondary",
  };
  const Icon = config.icon;

  return (
    <span
      data-slot="role-badge"
      className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}
    >
      <span
        data-slot="role-chip"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-sm border-0",
          config.className,
        )}
        aria-hidden="true"
      >
        <Icon className="size-3.5 shrink-0" />
      </span>
      <span className="text-body-sm font-normal text-ink">{config.label}</span>
    </span>
  );
}

export const RoleChip = RoleBadge;
