import { useState } from "react";
import { Calendar, ChartNoAxesColumn, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Granularity } from "@/entities/project";
import { formatRangeLabel, isGranularityAllowed, shiftDateRange } from "@/entities/project";
import { cn } from "@/shared/lib/cn";
import { DateRangePicker } from "@/shared/ui/date-range-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { normalizeScheduleRange, type ScheduleRangeValue } from "../model/use-schedule-range";

export const GRANULARITY_OPTIONS: { id: Granularity; label: string }[] = [
  { id: "day", label: "Hari" },
  { id: "week", label: "Minggu" },
  { id: "month", label: "Bulan" },
  { id: "year", label: "Tahun" },
];

const isGranularity = (value: string): value is Granularity =>
  GRANULARITY_OPTIONS.some((o) => o.id === value);

/*
 * Gaya disamakan dengan pengalih Overview/Timeline:
 * kontainer abu-abu lembut; nilai aktif berupa chip putih berbayangan tipis,
 * tombol ikon polos seperti tab yang tidak aktif.
 */
export const SEGMENT_GROUP = "inline-flex h-9 items-center gap-0.5 rounded-md bg-surface-subtle p-1";
export const SEGMENT_CHIP =
  "focus-ring h-full rounded-sm border border-transparent bg-surface text-xs font-normal text-ink shadow-float transition-[color,background-color,box-shadow] duration-150 ease-out";
export const SEGMENT_ICON_BUTTON =
  "focus-ring flex aspect-square h-full shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-ink";

interface ScheduleRangeControlsProps {
  value: ScheduleRangeValue;
  onChange: (next: ScheduleRangeValue) => void;
  className?: string;
}

/** Kontrol interval snapshot (Hari/Minggu/Bulan/Tahun) + navigasi rentang data. */
export function ScheduleRangeControls({ value, onChange, className }: ScheduleRangeControlsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { granularity, range } = value;
  const rangeLabel = formatRangeLabel(range);

  const change = (patch: Partial<ScheduleRangeValue>) =>
    onChange(normalizeScheduleRange({ ...value, ...patch }));

  return (
    <div className={cn("flex w-full items-center gap-2 sm:w-auto", className)}>
      {/* A. Interval snapshot (seperti timeframe pada chart trading) */}
      <div className={cn(SEGMENT_GROUP, "shrink-0")}>
        <Select
          value={granularity}
          onValueChange={(v) => {
            if (isGranularity(v)) change({ granularity: v });
          }}
        >
          <SelectTrigger
            aria-label="Interval snapshot"
            className={cn(
              SEGMENT_CHIP,
              "w-auto gap-1.5 px-3 hover:border-transparent [&>svg]:text-ink-muted",
            )}
          >
            <ChartNoAxesColumn className="size-3.5 shrink-0" aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" className="min-w-36">
            {GRANULARITY_OPTIONS.map((option) => {
              const allowed = isGranularityAllowed(range, option.id);
              return (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  disabled={!allowed}
                  title={allowed ? undefined : "Rentang terlalu panjang untuk interval ini"}
                  className="h-8 text-xs"
                >
                  {option.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* B. Rentang data: [ Sebelumnya ] [ Pemilih rentang ] [ Berikutnya ] */}
      <div className={cn(SEGMENT_GROUP, "min-w-0 flex-1 sm:flex-none")}>
        <button
          type="button"
          onClick={() => change({ range: shiftDateRange(range, -1) })}
          aria-label="Rentang sebelumnya"
          className={SEGMENT_ICON_BUTTON}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Rentang data: ${rangeLabel}`}
              className={cn(
                SEGMENT_CHIP,
                "flex min-w-0 flex-1 items-center justify-between gap-2 px-3 sm:flex-none",
              )}
            >
              <Calendar className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
              <span
                aria-live="polite"
                className="min-w-0 flex-1 truncate text-center font-normal tabular-nums sm:min-w-36"
              >
                {rangeLabel}
              </span>
              <ChevronDown className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            collisionPadding={16}
            className="w-auto max-w-[calc(100vw-2rem)] p-3 shadow-raised"
          >
            <DateRangePicker
              value={range}
              onChange={(next) => change({ range: next })}
              onClose={() => setIsPickerOpen(false)}
            />
          </PopoverContent>
        </Popover>

        <button
          type="button"
          onClick={() => change({ range: shiftDateRange(range, 1) })}
          aria-label="Rentang berikutnya"
          className={SEGMENT_ICON_BUTTON}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
