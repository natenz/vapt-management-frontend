import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  UsersRound,
  Bug,
} from "lucide-react";
import type { RoleName } from "@/shared/api/schemas";

export const ROLE_LABEL: Record<RoleName, string> = {
  super_admin: "Superadmin",
  tech_lead: "Tech Lead",
  project_manager: "Project Manager",
  pentester: "Pentester",
  technical_writer: "Tech Writer",
};

export type NavItem = { label: string; to: string; icon: LucideIcon; roles: readonly RoleName[] };

const ALL: readonly RoleName[] = [
  "super_admin",
  "tech_lead",
  "project_manager",
  "pentester",
  "technical_writer",
];

// Menu per role. Mengikuti mockup Figma "VAPT Command Center" dan aturan akses di BE.
export const NAV: readonly NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ALL },
  { label: "Proyek", to: "/projects", icon: FolderKanban, roles: ALL },
  { label: "Project Template", to: "/projects/new", icon: LayoutTemplate, roles: ["super_admin", "tech_lead"] },
  { label: "Temuan", to: "/findings", icon: Bug, roles: ["pentester", "technical_writer", "project_manager"] },
  { label: "Koreksi & Laporan", to: "/reports", icon: ClipboardCheck, roles: ["technical_writer", "project_manager"] },
  { label: "Katalog Kerentanan", to: "/catalog", icon: FileText, roles: ALL },
  { label: "Kelola User", to: "/users", icon: UsersRound, roles: ["super_admin"] },
  { label: "Hak Akses Role", to: "/roles", icon: Lock, roles: ["super_admin"] },
];

export function isRole(name: string | undefined | null): name is RoleName {
  return ALL.some((r) => r === name);
}

export function navFor(role: string | undefined) {
  return isRole(role) ? NAV.filter((i) => i.roles.includes(role)) : [];
}
