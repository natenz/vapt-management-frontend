import { NavLink } from "react-router";
import trusteraLogo from "@/shared/assets/logo-trustera-red.png";
import trusteraMark from "@/shared/assets/logo-trustera-mark.png";
import { useSession } from "@/entities/session";
import { CollapseToggle, useSidebarStore } from "@/features/toggle-sidebar";
import { navFor } from "@/shared/config/roles";
import { cn } from "@/shared/lib/cn";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <NavLink to="/dashboard" className="flex items-center rounded-sm focus-ring">
      <img
        src={trusteraLogo}
        alt="Trustera"
        width={1024}
        height={257}
        className={cn("h-8 w-auto logo-adaptive", collapsed && "lg:hidden")}
      />
      <img
        src={trusteraMark}
        alt="Trustera"
        width={209}
        height={209}
        className={cn("hidden size-8 object-contain logo-adaptive", collapsed && "lg:block")}
      />
    </NavLink>
  );
}

export function AppSidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const { user } = useSession();
  const roleName = user?.role?.role_name;
  const items = navFor(roleName);

  return (
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
  );
}
