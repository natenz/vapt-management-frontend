import {
  FileEdit,
  Crosshair,
  ShieldAlert,
  LineChart,
  FileCheck,
  Wrench,
  RefreshCw,
  FileSpreadsheet,
  Presentation,
  CheckCircle2,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";

export interface StatusConfig {
  icon: LucideIcon;
  className: string;
}

/*
 * Tema terang: latar pastel solid + ikon gelap.
 * Tema gelap: latar tint transparan (menyatu dengan permukaan gelap) + ikon terang,
 * agar chip tidak tampil sebagai kotak putih yang mencolok.
 */
const STATUS_CONFIG: Record<string, StatusConfig> = {
  Draft: {
    icon: FileEdit,
    className: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  },
  Scoping: {
    icon: Crosshair,
    className: "bg-cyan-50 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300",
  },
  Assessment: {
    icon: ShieldAlert,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  Analysis: {
    icon: LineChart,
    className: "bg-indigo-50 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300",
  },
  "Initial Report": {
    icon: FileCheck,
    className: "bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  },
  Remediasi: {
    icon: Wrench,
    className: "bg-rose-50 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  },
  Retesting: {
    icon: RefreshCw,
    className: "bg-purple-50 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300",
  },
  "Final Report Drafting": {
    icon: FileSpreadsheet,
    className: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300",
  },
  "Final Presentation": {
    icon: Presentation,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  Done: {
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 dark:bg-green-400/15 dark:text-green-300",
  },
};

const FALLBACK_STYLE: StatusConfig = {
  icon: Circle,
  className: "bg-surface-subtle text-ink-secondary",
};

/**
 * Ikon + kelas chip pastel per status/tahap proyek. Dipakai juga oleh label
 * tahap di Gantt detail proyek agar warnanya sama dengan badge status.
 */
export function getProjectStatusStyle(name?: string | null): StatusConfig {
  return (name && STATUS_CONFIG[name]) || FALLBACK_STYLE;
}

export function ProjectStatusBadge({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const label = name ?? "-";
  const config = getProjectStatusStyle(label);
  const Icon = config.icon;

  return (
    <span
      data-slot="project-status-badge"
      className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}
    >
      <span
        data-slot="project-status-chip"
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-sm border-0",
          config.className,
        )}
        aria-hidden="true"
      >
        <Icon className="size-3.5 shrink-0" />
      </span>
      <span className="text-body-sm font-normal text-ink">{label}</span>
    </span>
  );
}
