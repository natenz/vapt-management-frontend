/**
 * Kalender tim berbentuk Gantt (SVAR, sama dengan timeline Resource dan Proyek): satu baris per
 * proyek, akhir pekan dan hari libur diarsir. Pentester baru tampil saat batang disorot atau diketuk.
 */
import { Gantt, Willow } from "@svar-ui/react-gantt";
import type { IApi, IColumnConfig, ITask } from "@svar-ui/react-gantt";
import { isWeekend, max, startOfDay, subDays } from "date-fns";
import { AlertTriangle, CalendarCheck, CalendarOff } from "lucide-react";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, UIEvent } from "react";
import { Link, useNavigate } from "react-router";
import type { TeamCalendar as CalendarData } from "@/entities/calendar";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  GanttTooltip,
  TODAY_CELL_CLASS,
  WEEKEND_CELL_CLASS,
  exclusiveEnd,
  getTimelineScales,
  isCurrentPeriod,
  useColorScheme,
  useMediaQuery,
} from "@/shared/ui/svar-gantt";
import {
  buildProjectRows,
  currentMonthSchedule,
  toIsoDate,
  type CalendarFilters,
  type CalendarRow,
} from "../model/calendar-rows";

const CELL_HEIGHT = 44;
const SCALE_HEIGHT = 32;
/** Sel hari lebih rapat dari timeline lain supaya satu bulan muat di layar lebar. */
const DAY_CELL_WIDTH = 28;
/** Ruang untuk scrollbar horizontal dan garis tepi agar baris terakhir tidak tertutup. */
const CHART_PADDING = 28;

const BAR_CLASS = {
  // Netral pekat supaya jelas beda dari merah bentrok.
  booking: "bg-surface-inverse text-ink-inverse",
  masked: "bg-surface-subtle text-ink-secondary",
  warning: "bg-error-bg text-error",
};

/** Tooltip hover hanya memuat sejumlah ini agar tidak melewati tepi layar. */
const MAX_ENTRIES = 6;

/** Data baris dan pengaturan batang; taskTemplate SVAR tidak menerima props tambahan. */
const CalendarContext = createContext<{ rows: ReadonlyMap<string, CalendarRow>; showNames: boolean; canHover: boolean }>({
  rows: new Map(),
  showNames: false,
  canHover: true,
});

/** Task SVAR hanya membawa nilai primitif dan Date; isi barisnya diambil dari context. */
type CalendarTask = { id: string; rowId: string; text: string; start: Date; end: Date; type: "task" };

export interface TeamCalendarProps {
  data: CalendarData | undefined;
  isLoading: boolean;
  schedule: ScheduleRangeValue;
  onScheduleChange: (next: ScheduleRangeValue) => void;
  filters?: CalendarFilters;
}

export function TeamCalendar({ data, isLoading, schedule, onScheduleChange, filters }: TeamCalendarProps) {
  const navigate = useNavigate();
  const colorScheme = useColorScheme();
  const isWide = useMediaQuery("(min-width: 768px)");
  const canHover = useMediaQuery("(hover: hover)");
  const apiRef = useRef<IApi | null>(null);
  const [tip, setTip] = useState<{ rowId: string; x: number; y: number; pinned: boolean } | null>(null);

  const { granularity, range } = schedule;
  const rows = useMemo(
    () => buildProjectRows(data, range, { splitDays: granularity === "day", filters }),
    [data, range, granularity, filters],
  );
  const tasks = useMemo<CalendarTask[]>(
    () =>
      rows.map((row) => ({
        id: row.id,
        rowId: row.id,
        text: row.name,
        // Sepanjang rentang: potongan batang diposisikan dalam persen rentang tampilan.
        start: startOfDay(range.start),
        end: exclusiveEnd(startOfDay(range.end)),
        type: "task",
      })),
    [rows, range],
  );
  const holidays = useMemo(() => data?.holidays ?? [], [data]);
  const holidayDates = useMemo(() => holidays.map((h) => h.date.slice(0, 10)), [holidays]);
  const barContext = useMemo(
    () => ({ rows: new Map(rows.map((row) => [row.id, row])), showNames: !isWide, canHover }),
    [rows, isWide, canHover],
  );
  const { scales, cellWidth } = useMemo(() => getTimelineScales(granularity), [granularity]);

  const today = new Date();
  const isInRange = (date: Date) => date >= range.start && date < exclusiveEnd(range.end);

  const handleInit = (api: IApi) => {
    apiRef.current = api;
    if (isInRange(new Date())) setTimeout(() => scrollToToday(api), 0);
  };

  /** Sisakan seminggu ke belakang agar penugasan yang sedang berjalan tetap kelihatan. */
  const scrollToToday = (api: IApi) =>
    api.exec("scroll-chart", { date: max([startOfDay(range.start), subDays(new Date(), 7)]) });

  const handleToday = () => {
    if (isInRange(today)) {
      if (apiRef.current) scrollToToday(apiRef.current);
      return;
    }
    onScheduleChange({ ...currentMonthSchedule(today), granularity });
  };

  // SVAR membungkus batang dalam kontainer overflow sendiri, jadi `position: sticky` tidak jalan;
  // posisi geser chart diteruskan lewat variabel CSS untuk label nama di layar sempit.
  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("wx-chart")) {
      event.currentTarget.style.setProperty("--calendar-scroll", `${target.scrollLeft}px`);
    }
  };

  /** Baris proyek dari potongan batang yang ditunjuk; area kosong bukan sasaran. */
  const rowAt = (target: EventTarget) => {
    const id = (target as HTMLElement).closest<HTMLElement>('[data-slot="calendar-segment"]')?.dataset.row;
    return id ? barContext.rows.get(id) : undefined;
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!canHover) return;
    const row = rowAt(event.target);
    setTip(row ? { rowId: row.id, x: event.clientX, y: event.clientY, pinned: false } : null);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const row = rowAt(event.target);
    if (canHover) {
      if (row?.projectId) navigate(`/projects/${row.projectId}`);
      return;
    }
    // Layar sentuh: daftar pentester dulu, proyek dibuka lewat tautannya.
    setTip(row ? { rowId: row.id, x: event.clientX, y: event.clientY, pinned: true } : null);
  };

  // Layar sempit hanya menampilkan chart; nama proyek digambar di barisnya.
  const columns: IColumnConfig[] = [{ id: "text", header: "Proyek", flexgrow: 1, width: 240, cell: ProjectCell }];

  if (isLoading) return <Skeleton className="h-96" />;

  const tipRow = tip ? barContext.rows.get(tip.rowId) : undefined;

  const ganttKey = [
    colorScheme,
    isWide,
    granularity,
    range.start.getTime(),
    range.end.getTime(),
    tasks.map((t) => t.id).join(","),
  ].join("|");
  const chartHeight = SCALE_HEIGHT * scales.length + CELL_HEIGHT * tasks.length + CHART_PADDING;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend />
        <Button type="button" variant="quiet" onClick={handleToday} className="h-9 gap-1.5 px-3 text-xs">
          <CalendarCheck aria-hidden />
          Hari ini
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-md border border-border bg-surface">
          <EmptyState
            icon={<CalendarOff />}
            title="Tidak ada jadwal yang cocok"
            description="Ubah filter atau pilih rentang tanggal lain."
          />
        </div>
      ) : (
        <CalendarContext.Provider value={barContext}>
          <div
            data-slot="team-calendar-chart"
            role="region"
            aria-label="Jadwal tim"
            className="vapt-gantt min-w-0 overflow-hidden rounded-md border border-border bg-surface [&_.wx-willow-theme]:h-full"
            data-theme={colorScheme}
            style={{ height: `min(${chartHeight}px, max(480px, calc(100vh - 320px)))` }}
            onClick={handleClick}
            onScrollCapture={handleScroll}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setTip((current) => (current?.pinned ? current : null))}
          >
            <Willow fonts={false}>
              <Gantt
                key={ganttKey}
                init={handleInit}
                readonly
                tasks={tasks as unknown as ITask[]}
                scales={scales}
                start={range.start}
                end={exclusiveEnd(range.end)}
                autoScale={false}
                lengthUnit="day"
                cellWidth={granularity === "day" ? DAY_CELL_WIDTH : cellWidth}
                cellHeight={CELL_HEIGHT}
                scaleHeight={SCALE_HEIGHT}
                columns={columns}
                gridWidth={240}
                displayMode={isWide ? "all" : "chart"}
                taskTemplate={CalendarBar}
                highlightTime={(date, unit) => {
                  if (unit !== granularity) return "";
                  if (isCurrentPeriod(date, unit, today)) return TODAY_CELL_CLASS;
                  const off = unit === "day" && (isWeekend(date) || holidayDates.includes(toIsoDate(date)));
                  return off ? WEEKEND_CELL_CLASS : "";
                }}
              />
            </Willow>
          </div>
        </CalendarContext.Provider>
      )}

      {holidays.length > 0 ? (
        <ul aria-label="Hari libur di rentang ini" className="flex flex-wrap gap-2 text-caption text-ink-muted">
          {holidays.map((h) => (
            <li key={h.holiday_id} className="rounded-xs bg-info-bg px-2 py-0.5">
              {fmtDate(h.date)} · {h.name}
            </li>
          ))}
        </ul>
      ) : null}

      {tip && tipRow ? <ProjectTooltip row={tipRow} {...tip} onClose={() => setTip(null)} /> : null}
    </div>
  );
}

/* ---------- Sel grid ---------- */

function ProjectCell(props: { row: unknown }) {
  const task = props.row as CalendarTask;
  return (
    <span className="block truncate pr-2 text-xs text-ink" title={task.text}>
      {task.text}
    </span>
  );
}

/* ---------- Batang ---------- */

function CalendarBar({ data }: { data: ITask }) {
  const { rows, showNames, canHover } = useContext(CalendarContext);
  const row = rows.get((data as unknown as CalendarTask).rowId);
  if (!row) return null;
  // Satu ikon per baris sudah cukup sebagai penanda selain warna.
  const marked = row.segments.filter((s) => s.conflict).sort((a, b) => b.width - a.width)[0];
  const clickable = Boolean(row.projectId) || !canHover;

  return (
    <div className="absolute inset-0 cursor-default">
      {showNames ? (
        <span
          className="absolute top-0 left-0 pl-1.5 text-[11px] leading-4 font-medium whitespace-nowrap text-ink"
          style={{ transform: "translateX(var(--calendar-scroll, 0px))" }}
        >
          {row.name}
        </span>
      ) : null}
      {row.segments.map((segment) => (
        <span
          key={segment.startsAt}
          data-slot="calendar-segment"
          data-row={row.id}
          data-start={segment.startsAt}
          data-end={segment.endsAt}
          data-conflict={segment.conflict ? "true" : undefined}
          className={cn(
            "absolute flex items-center justify-center overflow-hidden rounded-sm border-l-[3px] border-current",
            showNames ? "bottom-0 h-4" : "inset-y-0.5",
            BAR_CLASS[segment.conflict ? "warning" : row.masked ? "masked" : "booking"],
            clickable ? "cursor-pointer" : "cursor-default",
          )}
          style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
        >
          {segment === marked ? <AlertTriangle className="size-3 shrink-0" aria-label="Ada peringatan bentrok" /> : null}
        </span>
      ))}
    </div>
  );
}

/* ---------- Keterangan dan tooltip ---------- */

function Legend() {
  const items: [string, string][] = [
    ["Penugasan", BAR_CLASS.booking],
    ["Bentrok", BAR_CLASS.warning],
    ["Proyek lain", BAR_CLASS.masked],
    ["Libur / akhir pekan", "bg-info-bg"],
  ];
  return (
    <ul className="flex flex-wrap items-center gap-3 text-caption text-ink-muted" aria-label="Keterangan warna">
      {items.map(([label, cls]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("inline-block size-3 rounded-xs border border-border", cls)} aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}

function ProjectTooltip({
  row,
  x,
  y,
  pinned,
  onClose,
}: {
  row: CalendarRow;
  x: number;
  y: number;
  pinned: boolean;
  onClose: () => void;
}) {
  const shown = pinned ? row.entries : row.entries.slice(0, MAX_ENTRIES);
  const hidden = row.entries.length - shown.length;
  return (
    <GanttTooltip x={x} y={y} pinned={pinned} data-slot="team-calendar-tooltip">
      <div className="flex flex-col gap-1.5 text-[11px] text-ink-muted">
        <p className="border-b border-border pb-1.5 text-xs font-medium text-ink">{row.name}</p>
        <ul className={cn("flex flex-col gap-1.5", pinned && "max-h-48 overflow-y-auto")}>
          {shown.map((entry) => (
            <li key={entry.mandaysId}>
              <p className="text-ink">{[entry.person, entry.asset].filter(Boolean).join(" · ")}</p>
              <p>
                {fmtDate(entry.startDate)} – {fmtDate(entry.endDate)} · {entry.allocatedMandays} MD
              </p>
              {entry.warning ? <p className="text-error">{entry.warning}</p> : null}
            </li>
          ))}
        </ul>
        {hidden > 0 ? <p>+{hidden} penugasan lain</p> : null}
        {pinned ? (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5">
            {row.projectId ? (
              <Link to={`/projects/${row.projectId}`} className="rounded-xs text-xs font-medium text-brand focus-ring">
                Buka proyek
              </Link>
            ) : (
              <span />
            )}
            <Button type="button" variant="quiet" onClick={onClose} className="h-7 px-2 text-xs">
              Tutup
            </Button>
          </div>
        ) : row.projectId ? (
          <p className="border-t border-border pt-1 text-[10px]">Klik batang untuk membuka detail proyek</p>
        ) : null}
      </div>
    </GanttTooltip>
  );
}
