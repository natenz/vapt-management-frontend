import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useThemeStore, type Theme } from "@/features/toggle-theme/model/theme-store";
import { cn } from "@/shared/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikut sistem", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2]!;
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tema: ${active.label}`}
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-sm text-ink-secondary",
          "focus-ring transition-colors duration-150 ease-out hover:bg-surface-subtle hover:text-ink",
          className,
        )}
      >
        <ActiveIcon className="size-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = option.value === theme;

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => setTheme(option.value)}
              className="justify-between"
            >
              <span className="flex items-center gap-3">
                <Icon />
                {option.label}
              </span>
              {selected ? <Check className="text-brand" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
