import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Lock,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";

export const ROLES = [
  "super_admin",
  "tech_lead",
  "project_manager",
  "pentester",
  "technical_writer",
] as const;
export type RoleName = (typeof ROLES)[number];

export const ROLE_LABEL: Record<RoleName, string> = {
  super_admin: "Superadmin",
  tech_lead: "Tech Lead",
  project_manager: "Project Manager",
  pentester: "Pentester",
  technical_writer: "Tech Writer",
};

export type NavSection = "operasi" | "akun";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: readonly RoleName[];
  section: NavSection;
};

const ALL: readonly RoleName[] = ROLES;

// Menu per role. Mengikuti mockup Figma "VAPT Command Center" dan aturan akses di BE.
export const NAV: readonly NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ALL, section: "operasi" },
  { label: "Proyek", to: "/projects", icon: FolderKanban, roles: ALL, section: "operasi" },
  { label: "Resource", to: "/resources", icon: Users, roles: ["super_admin", "tech_lead"], section: "operasi" },
  { label: "Koreksi & Laporan", to: "/reports", icon: ClipboardCheck, roles: ["technical_writer", "project_manager"], section: "operasi" },
  { label: "Katalog Kerentanan", to: "/catalog", icon: FileText, roles: ALL, section: "operasi" },
  { label: "Kelola User", to: "/users", icon: UsersRound, roles: ["super_admin"], section: "akun" },
  { label: "Akun Saya", to: "/account", icon: UserCog, roles: ALL, section: "akun" },
  { label: "Hak Akses Role", to: "/roles", icon: Lock, roles: ["super_admin"], section: "akun" },
  { label: "Guideline", to: "#", icon: BookOpen, roles: ALL, section: "akun" },
];

export function isRole(name: string | undefined | null): name is RoleName {
  return ALL.some((r) => r === name);
}

export function navFor(role: string | undefined) {
  return isRole(role) ? NAV.filter((i) => i.roles.includes(role)) : [];
}
