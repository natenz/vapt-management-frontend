import { useState } from "react";
import type { ReactNode } from "react";
import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { formatDateRangeLabel, type DateRange } from "@/shared/lib/date-range";
import { cn } from "@/shared/lib/cn";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClose: () => void;
}

interface RangePreset {
  id: string;
  label: string;
  getRange: (today: Date) => DateRange;
  accent?: boolean;
}

const lastDay = (d: Date) => startOfDay(endOfMonth(d));

const PRESETS: RangePreset[] = [
  {
    id: "this-month",
    label: "Bulan ini",
    getRange: (t) => ({ start: startOfMonth(t), end: lastDay(t) }),
  },
  {
    id: "last-3-months",
    label: "3 bulan terakhir",
    getRange: (t) => ({ start: startOfMonth(subMonths(t, 2)), end: lastDay(t) }),
  },
  {
    id: "last-6-months",
    label: "6 bulan terakhir",
    getRange: (t) => ({ start: startOfMonth(subMonths(t, 5)), end: lastDay(t) }),
  },
  {
    id: "last-12-months",
    label: "12 bulan terakhir",
    getRange: (t) => ({ start: startOfMonth(subMonths(t, 11)), end: lastDay(t) }),
  },
  {
    id: "this-year",
    label: "Tahun ini",
    getRange: (t) => ({ start: startOfYear(t), end: startOfDay(endOfYear(t)) }),
    accent: true,
  },
  {
    id: "last-year",
    label: "Tahun lalu",
    getRange: (t) => {
      const y = subYears(t, 1);
      return { start: startOfYear(y), end: startOfDay(endOfYear(y)) };
    },
  },
];

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const sameRange = (a: DateRange, b: DateRange) =>
  isSameDay(a.start, b.start) && isSameDay(a.end, b.end);

export function DateRangePicker({ value, onChange, onClose }: DateRangePickerProps) {
  const today = startOfDay(new Date());
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(value.end));
  // Tanggal awal yang sedang dipilih; null berarti belum memulai pemilihan baru
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const commit = (range: DateRange) => {
    onChange(range);
    onClose();
  };

  const handleDayClick = (day: Date) => {
    if (!draftStart) {
      setDraftStart(day);
      return;
    }
    const start = isBefore(day, draftStart) ? day : draftStart;
    const end = isBefore(day, draftStart) ? draftStart : day;
    setDraftStart(null);
    commit({ start, end });
  };

  // Rentang yang disorot: pratinjau saat memilih, atau nilai aktif
  const previewEnd = draftStart ? (hoverDate ?? draftStart) : null;
  const highlight: DateRange = draftStart
    ? {
        start: isBefore(previewEnd!, draftStart) ? previewEnd! : draftStart,
        end: isBefore(previewEnd!, draftStart) ? draftStart : previewEnd!,
      }
    : value;

  const monthStart = startOfMonth(viewMonth);
  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const daysInMonth = endOfMonth(viewMonth).getDate();

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Preset rentang cepat */}
      <ul
        aria-label="Rentang cepat"
        className="grid grid-cols-2 gap-1 border-b border-border pb-3 sm:flex sm:w-36 sm:flex-col sm:border-r sm:border-b-0 sm:pr-3 sm:pb-0"
      >
        {PRESETS.map((preset) => {
          const range = preset.getRange(today);
          const isActive = !draftStart && sameRange(range, value);
          return (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => commit(range)}
                aria-pressed={isActive}
                className={cn(
                  "focus-ring w-full rounded-xs px-2.5 py-1.5 text-left text-xs font-normal transition-colors",
                  isActive
                    ? "bg-surface-subtle text-ink"
                    : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
                  preset.accent && "text-brand hover:text-brand",
                )}
              >
                {preset.label}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Kalender rentang */}
      <div className="flex w-64 flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <NavButton label="Tahun sebelumnya" onClick={() => setViewMonth((m) => subYears(m, 1))}>
              <ChevronsLeft className="size-4" aria-hidden />
            </NavButton>
            <NavButton label="Bulan sebelumnya" onClick={() => setViewMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="size-4" aria-hidden />
            </NavButton>
          </div>
          <span aria-live="polite" className="text-xs font-normal text-ink">
            {format(viewMonth, "MMMM yyyy", { locale: idLocale })}
          </span>
          <div className="flex items-center">
            <NavButton label="Bulan berikutnya" onClick={() => setViewMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="size-4" aria-hidden />
            </NavButton>
            <NavButton label="Tahun berikutnya" onClick={() => setViewMonth((m) => addYears(m, 1))}>
              <ChevronsRight className="size-4" aria-hidden />
            </NavButton>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] font-normal text-ink-muted">
          {WEEKDAYS.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>

        <div
          className="grid grid-cols-7 gap-y-0.5"
          onMouseLeave={() => setHoverDate(null)}
        >
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <span key={`blank-${i}`} className="h-8" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1);
            const isStart = isSameDay(day, highlight.start);
            const isEnd = isSameDay(day, highlight.end);
            const isEdge = isStart || isEnd;
            const inRange = isAfter(day, highlight.start) && isBefore(day, highlight.end);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={i}
                className={cn(
                  "flex h-8 items-center justify-center",
                  (inRange || (isEdge && !isSameDay(highlight.start, highlight.end))) &&
                    "bg-surface-subtle",
                  isStart && "rounded-l-sm",
                  isEnd && "rounded-r-sm",
                )}
              >
                <button
                  type="button"
                  aria-label={format(day, "d MMMM yyyy", { locale: idLocale })}
                  aria-pressed={isEdge}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => setHoverDate(day)}
                  className={cn(
                    "focus-ring flex size-8 items-center justify-center rounded-sm text-xs font-normal tabular-nums transition-colors",
                    isEdge
                      ? "bg-surface-inverse text-ink-inverse"
                      : "text-ink hover:bg-surface-subtle",
                    isToday && !isEdge && "ring-1 ring-border-strong ring-inset",
                  )}
                >
                  {i + 1}
                </button>
              </div>
            );
          })}
        </div>

        <p className="border-t border-border pt-2 text-[11px] text-ink-muted">
          {draftStart
            ? `Mulai ${format(draftStart, "d MMM yyyy", { locale: idLocale })}, pilih tanggal akhir`
            : formatDateRangeLabel(value)}
        </p>
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="focus-ring rounded-xs p-1 text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
    >
      {children}
    </button>
  );
}
