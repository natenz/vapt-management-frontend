/**
 * Combobox: pilih satu dari daftar panjang dengan mengetik untuk menyaring.
 * Popover + input; panah atas/bawah memindah sorotan, Enter memilih, Esc menutup.
 * Opsi dikelompokkan lewat `group`. Bukan pengganti Select untuk daftar pendek.
 */
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/shared/lib/cn";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover";

export type ComboOption = {
  value: string;
  label: string;
  group?: string;
  /** Teks kanan opsi (mis. beban mandays). */
  hint?: string;
  /** Merah bila true. */
  warn?: boolean;
};

/** Saring tanpa peduli huruf besar/kecil; semua kata pencarian harus muncul di label. */
export function filterOptions(options: ComboOption[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return options.filter((o) => words.every((w) => o.label.toLowerCase().includes(w)));
}

type Props = {
  id?: string;
  options: ComboOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function Combobox({ id, options, onSelect, placeholder = "Ketik untuk mencari", emptyText = "Tidak ada hasil", ...aria }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();
  const shown = React.useMemo(() => filterOptions(options, query), [options, query]);

  React.useEffect(() => setActive(0), [query, open]);

  const choose = (o: ComboOption) => {
    onSelect(o.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && shown[active]) {
      e.preventDefault();
      choose(shown[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  let lastGroup: string | undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            value={query}
            placeholder={placeholder}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-10 w-full rounded-sm border border-border-control bg-surface pr-10 pl-3 text-input text-ink focus-ring aria-[invalid=true]:border-error"
            {...aria}
          />
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="max-h-72 w-(--radix-popover-trigger-width) overflow-y-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => { if ((e.target as HTMLElement).id === id) e.preventDefault(); }}
      >
        <ul id={listId} role="listbox" className="flex flex-col">
          {shown.length === 0 ? <li className="px-3 py-2 text-body-sm text-ink-muted">{emptyText}</li> : null}
          {shown.map((o, i) => {
            const header = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            return (
              <React.Fragment key={o.value}>
                {header ? <li role="presentation" className="px-3 pt-2 pb-1 text-overline text-ink-muted uppercase">{header}</li> : null}
                <li
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-body-sm text-ink",
                    i === active && "bg-surface-subtle",
                  )}
                >
                  <span>{o.label}</span>
                  {o.hint ? <span className={cn("shrink-0 tabular", o.warn ? "font-medium text-error" : "text-ink-muted")}>{o.hint}</span> : null}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
