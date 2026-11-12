import { LogOut, UserCog } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import trusteraMark from "@/shared/assets/logo-trustera-mark.png";
import { useSession } from "@/entities/session";
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

export function AppHeader() {
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
  const current = items.find(
    (i) => i.to !== "#" && (pathname === i.to || (i.to !== "/dashboard" && pathname.startsWith(i.to))),
  );
  const isAccountActive = pathname === "/account" || pathname.startsWith("/account/");

  return (
    <header className="z-nav flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg px-4 lg:px-6">
      <NavLink
        to="/dashboard"
        className="flex shrink-0 items-center rounded-sm focus-ring lg:hidden"
      >
        <img
          src={trusteraMark}
          alt="Trustera"
          width={209}
          height={209}
          className="size-7 object-contain logo-adaptive"
        />
      </NavLink>
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
            onSelect={() => navigate("/account")}
            className={cn(isAccountActive && "bg-surface-subtle font-medium text-brand")}
          >
            <UserCog className="size-4" aria-hidden />
            Akun Saya
          </DropdownMenuItem>
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
  );
}
