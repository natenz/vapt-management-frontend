import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebarStore } from "@/features/toggle-sidebar/model/sidebar-store";
import { cn } from "@/shared/lib/cn";

export function CollapseToggle({ className }: { className?: string }) {
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggleCollapsed = useSidebarStore((state) => state.toggleCollapsed);
  const label = collapsed ? "Tampilkan navigasi" : "Sembunyikan navigasi";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <button
      type="button"
      onClick={toggleCollapsed}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-10 items-center gap-3 rounded-sm px-3 text-nav-link text-ink-secondary",
        "focus-ring transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-ink",
        "w-full",
        collapsed && "justify-center px-0",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {collapsed ? null : <span>Sembunyikan</span>}
    </button>
  );
}
