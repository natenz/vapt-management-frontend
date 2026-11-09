import { LogOut, ShieldCheck } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/entities/session";
import { CollapseToggle, useSidebarStore } from "@/features/toggle-sidebar";
import { ThemeToggle } from "@/features/toggle-theme";
import { navFor, ROLE_LABEL, isRole } from "@/shared/config/roles";
import { cn } from "@/shared/lib/cn";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Breadcrumb } from "@/shared/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <NavLink to="/dashboard" className="flex items-center gap-2 rounded-sm focus-ring">
      <span className="flex size-8 items-center justify-center rounded-sm bg-surface-brand text-on-brand">
        <ShieldCheck className="size-4.5" aria-hidden />
      </span>
      <span className={cn("text-title-sm text-ink", collapsed && "lg:sr-only")}>VAPT</span>
    </NavLink>
  );
}

export function DashboardLayout() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const { user, clear } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const roleName = user?.role?.role_name;
  const items = navFor(roleName);
  const roleLabel = isRole(roleName) ? ROLE_LABEL[roleName] : "Pengguna";
  const name = user?.profile?.full_name ?? user?.username ?? "Pengguna";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  const current = items.find((i) => pathname === i.to || (i.to !== "/dashboard" && pathname.startsWith(i.to)));

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-bg">
      <aside
        className={cn(
          "hidden h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface lg:flex",
          "transition-[width] duration-200 ease-out",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border",
            collapsed ? "justify-center" : "px-4",
          )}
        >
          <Brand collapsed={collapsed} />
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-4">
          <p className={cn("mb-2 px-3 text-overline text-ink-muted uppercase", collapsed && "lg:sr-only")}>
            Operasi
          </p>
          <ul className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/dashboard" || item.to === "/projects"}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex h-10 items-center gap-3 rounded-sm px-3 text-nav-link focus-ring transition-colors duration-150 ease-out",
                        collapsed && "justify-center px-0",
                        isActive
                          ? "bg-surface-subtle text-brand"
                          : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className={cn("truncate", collapsed && "lg:sr-only")}>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-border p-2">
          <CollapseToggle />
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-nav flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg px-4 lg:px-6">
          <Breadcrumb
            items={[{ label: "VAPT", href: "/dashboard" }, { label: current?.label ?? "Detail" }]}
            className="min-w-0 flex-1"
            renderLink={(crumb, className) => (
              <NavLink to={crumb.href} className={className}>
                {crumb.label}
              </NavLink>
            )}
          />
          <span className="hidden rounded-full border border-border px-3 py-1 text-caption text-ink-secondary sm:inline-flex">
            {roleLabel}
          </span>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Menu akun" className="shrink-0 rounded-full focus-ring">
              <Avatar size="sm">
                <AvatarFallback>{initials || "PG"}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel>{name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  clear();
                  queryClient.clear();
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut className="size-4" aria-hidden />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-8 lg:px-6">
          <div className="mx-auto max-w-wide">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
