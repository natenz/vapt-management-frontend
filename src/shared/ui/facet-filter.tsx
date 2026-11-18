/**
 * Filter faset untuk toolbar tabel/daftar.
 *
 * - `FacetFilter`: multi-pilih dengan jumlah per opsi; menu tetap terbuka
 *   selama memilih dan menyediakan "Hapus pilihan".
 * - `SingleSelectFilter`: pilihan tunggal (mis. jadwal, pengelompokan, urutan).
 * - `FilterTrigger`: tombol pemicu gelap yang meringkas pilihan aktif.
 */
import { ChevronDown, ListFilter } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export interface FacetOption {
  value: string;
  /** Teks tampilan; default memakai `value`. */
  label?: string;
  count?: number;
}

/* ---------- Tombol pemicu bersama ---------- */

export function FilterTrigger({
  icon,
  title,
  activeLabel,
  className,
  ...props
}: {
  icon: ReactNode;
  title: string;
  /** Ringkasan pilihan aktif; kosong berarti filter tidak aktif. */
  activeLabel?: string;
} & ComponentProps<"button">) {
  const isActive = Boolean(activeLabel);
  return (
    <button
      type="button"
      {...props}
      data-active={isActive || undefined}
      className={cn(
        // Tombol filter gelap (surface-inverse) di kedua tema
        "inline-flex h-9 max-w-64 items-center gap-1.5 rounded-sm px-3 text-xs font-normal focus-ring transition-colors",
        "bg-surface-inverse text-ink-inverse hover:bg-surface-inverse-raised",
        "data-[state=open]:bg-surface-inverse-raised",
        className,
      )}
    >
      <span className="shrink-0 text-ink-inverse-muted [&_svg]:size-3.5" aria-hidden>
        {icon}
      </span>
      <span className="shrink-0">{title}</span>
      {isActive ? (
        <>
          <span aria-hidden className="h-3.5 w-px shrink-0 bg-ink-inverse-muted/40" />
          <span className="min-w-0 truncate">{activeLabel}</span>
        </>
      ) : null}
      <ChevronDown className="size-3.5 shrink-0 text-ink-inverse-muted" aria-hidden />
    </button>
  );
}

/* ---------- Filter faset multi-pilih ---------- */

export function FacetFilter({
  title,
  options,
  selected,
  onChange,
  icon = <ListFilter />,
  emptyText = "Tidak ada opsi",
}: {
  title: string;
  options: FacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  icon?: ReactNode;
  emptyText?: string;
}) {
  const selectedSet = new Set(selected);
  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? value;
  const activeLabel =
    selected.length === 0
      ? undefined
      : selected.length <= 2
        ? selected.map(labelOf).join(", ")
        : `${selected.length} dipilih`;

  const toggle = (value: string, checked: boolean) => {
    // Pertahankan urutan sesuai daftar opsi agar URL & label konsisten
    const nextSet = new Set(selected);
    if (checked) nextSet.add(value);
    else nextSet.delete(value);
    onChange(options.map((o) => o.value).filter((v) => nextSet.has(v)));
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <FilterTrigger
          icon={icon}
          title={title}
          activeLabel={activeLabel}
          aria-label={`Filter ${title}${activeLabel ? `: ${activeLabel}` : ""}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        {options.length === 0 ? (
          <p className="px-3 py-2 text-xs text-ink-muted">{emptyText}</p>
        ) : (
          <div className="scrollbar-minimal max-h-72 overflow-y-auto">
            {options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedSet.has(option.value)}
                // Menu tetap terbuka agar beberapa opsi bisa dipilih sekaligus
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => toggle(option.value, checked === true)}
                className="h-9 text-xs"
              >
                <span className="min-w-0 flex-1 truncate">{option.label ?? option.value}</span>
                {option.count === undefined ? null : (
                  <span className="ml-auto pl-3 text-ink-muted tabular-nums">{option.count}</span>
                )}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        )}
        {selected.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onChange([])}
              className="h-9 justify-center text-xs text-ink-secondary"
            >
              Hapus pilihan
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Pilihan tunggal ---------- */

export function SingleSelectFilter<T extends string>({
  title,
  icon,
  options,
  value,
  onChange,
  /** Nilai yang dianggap "tidak aktif" (tidak diringkas di tombol). */
  defaultValue,
  /** Tampilkan ringkasan pilihan meskipun bernilai default. */
  alwaysShowValue = false,
}: {
  title: string;
  icon: ReactNode;
  /** `count` opsional ditampilkan rata kanan, sama seperti `FacetFilter`. */
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  defaultValue?: T;
  alwaysShowValue?: boolean;
}) {
  const current = options.find((o) => o.value === value)?.label;
  const activeLabel = alwaysShowValue || value !== defaultValue ? current : undefined;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <FilterTrigger
          icon={icon}
          title={title}
          activeLabel={activeLabel}
          aria-label={`${title}${activeLabel ? `: ${activeLabel}` : ""}`}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value === option.value}
            onCheckedChange={() => onChange(option.value)}
            className="h-9 text-xs"
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.count === undefined ? null : (
              <span className="ml-auto pl-3 text-ink-muted tabular-nums">{option.count}</span>
            )}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
