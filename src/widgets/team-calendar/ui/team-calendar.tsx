/**
 * Kalender tim berbentuk Gantt (SVAR, sama dengan timeline Resource dan Proyek): satu baris per
 * pentester dengan penugasannya, akhir pekan dan hari libur diarsir.
 */
import { Gantt, Willow, locateTask } from "@svar-ui/react-gantt";
import type { IApi, IColumnConfig, ITask } from "@svar-ui/react-gantt";
import { addDays, isWeekend, max, startOfDay, subDays } from "date-fns";
import { AlertTriangle, CalendarCheck, CalendarOff } from "lucide-react";
import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, UIEvent } from "react";
import { useNavigate } from "react-router";
import type { TeamCalendar as CalendarData } from "@/entities/calendar";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { cn } from "@/shared/lib/cn";
import { fmtDate } from "@/shared/lib/format";
import { workingSegments } from "@/shared/lib/work-calendar";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
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
  buildCalendarTasks,
  currentMonthSchedule,
  toIsoDate,
  type CalendarTask,
} from "../model/calendar-tasks";

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

/** Pengaturan batang; taskTemplate SVAR tidak menerima props tambahan. */
const CalendarContext = createContext<{ holidays: readonly string[]; splitDays: boolean; showNames: boolean }>({
  holidays: [],
  splitDays: true,
  showNames: false,
});

export interface TeamCalendarProps {
  data: CalendarData | undefined;
  isLoading: boolean;
  schedule: ScheduleRangeValue;
  onScheduleChange: (next: ScheduleRangeValue) => void;
}

export function TeamCalendar({ data, isLoading, schedule, onScheduleChange }: TeamCalendarProps) {
  const navigate = useNavigate();
  const colorScheme = useColorScheme();
  const isWide = useMediaQuery("(min-width: 768px)");
  const apiRef = useRef<IApi | null>(null);
  const collapsedRef = useRef<Set<string>>(new Set());
  const [hover, setHover] = useState<{ task: CalendarTask; x: number; y: number } | null>(null);

  const { granularity, range } = schedule;
  const tasks = useMemo(() => buildCalendarTasks(data, range, collapsedRef.current), [data, range]);
  const holidays = useMemo(() => data?.holidays ?? [], [data]);
  const holidayDates = useMemo(() => holidays.map((h) => h.date.slice(0, 10)), [holidays]);
  const barContext = useMemo(
    () => ({ holidays: holidayDates, splitDays: granularity === "day", showNames: !isWide }),
    [holidayDates, granularity, isWide],
  );
  const { scales, cellWidth } = useMemo(() => getTimelineScales(granularity), [granularity]);

  const today = new Date();
  const isInRange = (date: Date) => date >= range.start && date < exclusiveEnd(range.end);

  const handleInit = (api: IApi) => {
    apiRef.current = api;
    api.on("open-task", (ev: { id: string | number; mode: boolean }) => {
      const id = String(ev.id);
      if (ev.mode) collapsedRef.current.delete(id);
      else collapsedRef.current.add(id);
    });
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

  const locate = (event: { target: EventTarget; nativeEvent: Event }) => {
    const api = apiRef.current;
    if (!api || !(event.target as HTMLElement).closest(".wx-bar")) return undefined;
    const located = locateTask(event.nativeEvent as globalThis.MouseEvent, api);
    return located ? (api.getTask(located.id) as unknown as CalendarTask | undefined) : undefined;
  };

  // SVAR membungkus batang dalam kontainer overflow sendiri, jadi `position: sticky` tidak jalan;
  // posisi geser chart diteruskan lewat variabel CSS untuk label nama di layar sempit.
  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains("wx-chart")) {
      event.currentTarget.style.setProperty("--calendar-scroll", `${target.scrollLeft}px`);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const task = locate(event);
    setHover(task?.kind === "booking" ? { task, x: event.clientX, y: event.clientY } : null);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const task = locate(event);
    if (task?.projectId) navigate(`/projects/${task.projectId}`);
  };

  // Layar sempit hanya menampilkan chart; nama pentester digambar di barisnya.
  const columns: IColumnConfig[] = [
    { id: "text", header: "Pentester & penugasan", flexgrow: 1, width: 215, cell: NameCell },
    { id: "info", header: "Beban", width: 110, cell: InfoCell },
  ];

  if (isLoading) return <Skeleton className="h-96" />;

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
            onPointerLeave={() => setHover(null)}
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
                gridWidth={325}
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

      {hover ? <BookingTooltip {...hover} /> : null}
    </div>
  );
}

/* ---------- Sel grid ---------- */

type CellProps = { row: unknown };
const asTask = (row: unknown) => row as CalendarTask;

function NameCell(props: CellProps) {
  const row = asTask(props.row);
  if (row.kind === "booking") {
    return (
      <span className="block truncate pl-6 text-xs text-ink-secondary" title={row.text}>
        {row.text}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2 pr-2">
      <Avatar size="sm" className="size-6 shrink-0 text-[10px]">
        <AvatarFallback className="bg-surface-subtle font-medium text-ink-secondary">{row.initials}</AvatarFallback>
      </Avatar>
      <span className="truncate text-xs font-medium text-ink">{row.name}</span>
      {row.bookingCount === 0 ? (
        <span className="ml-auto shrink-0 rounded-xs bg-success-bg px-1.5 text-[10px] text-success">Kosong</span>
      ) : null}
    </span>
  );
}

function InfoCell(props: CellProps) {
  const row = asTask(props.row);
  return (
    <span className="block truncate text-xs text-ink-secondary tabular-nums">
      {row.kind === "booking" ? `${row.allocatedMandays} MD` : `${row.workdays} hari kerja`}
    </span>
  );
}

/* ---------- Batang ---------- */

function CalendarBar({ data }: { data: ITask }) {
  const task = data as unknown as CalendarTask;
  const { holidays, splitDays, showNames } = useContext(CalendarContext);
  // Baris pentester hanya pengelompok; jadwalnya ada di baris penugasan.
  if (task.kind === "person") {
    return showNames ? (
      <span
        className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap pl-1.5 text-xs font-medium text-ink"
        style={{ transform: "translateX(var(--calendar-scroll, 0px))" }}
      >
        {task.bookingCount === 0 ? `${task.name} · Kosong` : task.name}
      </span>
    ) : (
      // Baris kosong ini tidak bisa diklik, jadi kursornya biasa.
      <span aria-hidden className="absolute inset-0 cursor-default" />
    );
  }

  const tone = task.warning ? "warning" : task.masked ? "masked" : "booking";
  const start = new Date(task.start);
  const segments = splitDays ? workingSegments(start, addDays(new Date(task.end), -1), holidays) : [];
  // Penugasan yang seluruhnya jatuh di hari nonkerja tetap digambar utuh.
  const parts = segments.length > 0 ? segments : [{ startsAt: toIsoDate(start), endsAt: task.endDate ?? "", left: 0, width: 100 }];
  const widest = parts.reduce((a, b) => (b.width > a.width ? b : a));

  return (
    <div className={cn("absolute inset-0", task.masked ? "cursor-default" : "cursor-pointer")}>
      {parts.map((part) => (
        <span
          key={part.startsAt}
          data-slot="calendar-work-segment"
          data-start={part.startsAt}
          data-end={part.endsAt}
          className={cn(
            "absolute inset-y-0 flex min-w-0 items-center gap-1 overflow-hidden rounded-sm border-l-[3px] border-current px-1.5 text-xs",
            BAR_CLASS[tone],
          )}
          style={{ left: `${part.left}%`, width: `${part.width}%` }}
        >
          {part === widest ? (
            <>
              {task.warning ? <AlertTriangle className="size-3 shrink-0" aria-label="Ada peringatan bentrok" /> : null}
              <span className="truncate">{task.text}</span>
            </>
          ) : null}
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

function BookingTooltip({ task, x, y }: { task: CalendarTask; x: number; y: number }) {
  return (
    <GanttTooltip x={x} y={y} data-slot="team-calendar-tooltip">
      <div className="flex flex-col gap-1 text-[11px] text-ink-muted">
        <p className="border-b border-border pb-1.5 text-xs font-medium text-ink">{task.projectName ?? task.text}</p>
        {task.assetName ? <p>Asset: {task.assetName}</p> : null}
        <p>
          Periode: {fmtDate(task.startDate)} – {fmtDate(task.endDate)}
        </p>
        <p>Alokasi: {task.allocatedMandays} MD</p>
        {task.warning ? <p className="text-error">Bentrok: {task.warning}</p> : null}
        {task.projectId ? (
          <p className="border-t border-border pt-1 text-[10px]">Klik batang untuk membuka detail proyek</p>
        ) : null}
      </div>
    </GanttTooltip>
  );
}
