/**
 * Gantt tahap/penugasan berbasis SVAR React Gantt (MIT) — library, tema, dan
 * skala yang sama dengan timeline proyek di /projects (lihat `./svar-gantt`).
 *
 * Kolom tahap tetap terlihat di grid kiri; seluruh periode proyek berada pada
 * satu kanvas horizontal. Mode edit mempertahankan perilaku lama: geser badan
 * batang untuk memindahkan, tarik ujungnya untuk mengubah durasi, panah
 * keyboard per hari — semuanya dibatasi rentang proyek.
 */
import { Gantt as SvarGantt, Willow, locateTask } from "@svar-ui/react-gantt";
import type { IApi, IColumnConfig, ITask } from "@svar-ui/react-gantt";
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isWeekend,
  max,
  min,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { CalendarCheck, MoveHorizontal } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
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

type GanttState = "done" | "current" | "todo";

type GanttItem = {
  id: string;
  label: string;
  owner?: string;
  startsAt: string;
  endsAt: string;
  state: GanttState;
  icon?: ReactNode;
  iconClassName?: string;
};

type GanttGranularity = "day" | "week";

const GRANULARITY_OPTIONS: { value: GanttGranularity; label: string }[] = [
  { value: "day", label: "Hari" },
  { value: "week", label: "Minggu" },
];

type GanttProps = {
  items: readonly GanttItem[];
  /** Posisi awal scroll; default pin progres atau tanggal item paling awal. */
  initialMonth?: Date;
  renderDetail?: (item: GanttItem) => ReactNode;
  editable?: boolean;
  rangeStart?: string;
  rangeEnd?: string;
  onItemChange?: (itemId: string, startsAt: string, endsAt: string) => void;
  /** Skala kalender (terkendali). Tanpa `onGranularityChange` disimpan internal. */
  granularity?: GanttGranularity;
  onGranularityChange?: (next: GanttGranularity) => void;
  className?: string;
};

type DragMode = "move" | "start" | "end";

const CELL_HEIGHT = 48;
const SCALE_HEIGHT = 32;
/** Penanda asal perubahan dari komponen ini sendiri (keyboard) agar tidak diproses ulang. */
const SELF_SOURCE = "vapt-gantt";

const RANGE_STATE: Record<GanttState, string> = {
  done: "bg-surface-brand text-on-brand border-brand",
  current: "bg-surface-inverse text-ink-inverse border-ink-inverse-muted",
  todo: "bg-surface-inverse text-ink-inverse border-ink-inverse-muted",
};

/** Task SVAR yang hanya membawa tipe primitif agar tidak memicu rekursi tak terbatas di lib-state SVAR. */
type GanttTask = {
  id: string;
  text: string;
  start: Date;
  end: Date;
  type: "task";
  index: number;
  state: GanttState;
  owner?: string;
  iconClassName?: string;
  /** Posisi pin progres dalam persen lebar batang; null bila bukan tahap aktif. */
  pin: number | null;
};

const GanttItemsContext = createContext<{
  itemsById: Map<string, GanttItem>;
}>({ itemsById: new Map() });

function parseDate(value: string) {
  const parsed = startOfDay(new Date(value));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function toDateValue(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function getProgressAnchor(items: readonly GanttItem[]) {
  const current = items.find((item) => item.state === "current");
  const latestDone = [...items].reverse().find((item) => item.state === "done");
  const item = current ?? latestDone;
  if (!item) return null;

  const start = parseDate(item.startsAt);
  const end = parseDate(item.endsAt);
  if (!start || !end || end < start) return null;

  const date = current ? min([end, max([start, startOfDay(new Date())])]) : end;
  return { itemId: item.id, date, start, end };
}

/**
 * Terapkan perubahan `delta` hari pada item dengan batas rentang proyek.
 * Pindah mempertahankan durasi; ubah ujung tidak boleh melewati ujung lainnya.
 */
function clampChange(
  item: Pick<GanttItem, "startsAt" | "endsAt">,
  mode: DragMode,
  delta: number,
  limit: { start: Date; end: Date },
): { startsAt: string; endsAt: string } | null {
  const itemStart = parseDate(item.startsAt);
  const itemEnd = parseDate(item.endsAt);
  if (!itemStart || !itemEnd) return null;

  let nextStart = itemStart;
  let nextEnd = itemEnd;

  if (mode === "start") {
    nextStart = min([itemEnd, max([limit.start, addDays(itemStart, delta)])]);
  } else if (mode === "end") {
    nextEnd = max([itemStart, min([limit.end, addDays(itemEnd, delta)])]);
  } else {
    nextStart = addDays(itemStart, delta);
    nextEnd = addDays(itemEnd, delta);
    if (nextStart < limit.start) {
      nextEnd = addDays(nextEnd, differenceInCalendarDays(limit.start, nextStart));
      nextStart = limit.start;
    }
    if (nextEnd > limit.end) {
      nextStart = addDays(nextStart, differenceInCalendarDays(limit.end, nextEnd));
      nextEnd = limit.end;
    }
  }

  return { startsAt: toDateValue(nextStart), endsAt: toDateValue(nextEnd) };
}

/** Mode drag dari payload `update-task` SVAR: kunci yang dikirim menandai ujung yang ditarik. */
function dragModeOf(task: Partial<ITask>): DragMode {
  const hasStart = task.start !== undefined;
  const hasEnd = task.end !== undefined;
  if (hasStart && !hasEnd) return "start";
  if (hasEnd && !hasStart) return "end";
  return "move";
}

const signatureOf = (items: readonly GanttItem[]) =>
  items.map((i) => `${i.id}:${i.startsAt}:${i.endsAt}:${i.state}`).join("|");

function Gantt({
  items,
  initialMonth,
  renderDetail,
  editable = false,
  rangeStart,
  rangeEnd,
  onItemChange,
  granularity: granularityProp,
  onGranularityChange,
  className,
}: GanttProps) {
  const [innerGranularity, setInnerGranularity] = useState<GanttGranularity>("day");
  const granularity = granularityProp ?? innerGranularity;
  const setGranularity = (next: GanttGranularity) => {
    if (onGranularityChange) onGranularityChange(next);
    else setInnerGranularity(next);
  };

  const [api, setApi] = useState<IApi | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ task: GanttTask; x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState<{ task: GanttTask; x: number; y: number } | null>(null);
  const colorScheme = useColorScheme();
  const isWide = useMediaQuery("(min-width: 768px)");

  // Item terbaru untuk handler SVAR yang didaftarkan sekali saat init
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onItemChangeRef = useRef(onItemChange);
  onItemChangeRef.current = onItemChange;

  const timeline = useMemo(() => {
    const dates = items.flatMap((item) => {
      const start = parseDate(item.startsAt);
      const end = parseDate(item.endsAt);
      return start && end && end >= start ? [start, end] : [];
    });
    const fixed = [parseDate(rangeStart ?? ""), parseDate(rangeEnd ?? "")].filter(
      (d): d is Date => Boolean(d),
    );
    const all = [...dates, ...fixed];
    if (all.length === 0) return null;
    return { start: startOfMonth(min(all)), end: endOfMonth(max(all)) };
  }, [items, rangeStart, rangeEnd]);

  const limit = useMemo(
    () =>
      timeline
        ? {
            start: parseDate(rangeStart ?? "") ?? timeline.start,
            end: parseDate(rangeEnd ?? "") ?? timeline.end,
          }
        : null,
    [timeline, rangeStart, rangeEnd],
  );
  const limitRef = useRef(limit);
  limitRef.current = limit;

  const progressAnchor = useMemo(() => getProgressAnchor(items), [items]);

  /*
   * Array task dipertahankan selama perubahan berasal dari drag/keyboard di
   * chart ini sendiri (SVAR sudah menampilkannya) — array baru membuat SVAR
   * memuat ulang data dan posisi scroll hilang. Perubahan dari luar (Batalkan,
   * data server) tetap membangun ulang task.
   */
  const shownRef = useRef<string>("");
  const tasksRef = useRef<GanttTask[]>([]);
  const signature = signatureOf(items);
  if (signature !== shownRef.current) {
    shownRef.current = signature;
    tasksRef.current = items.flatMap((item, index) => {
      const start = parseDate(item.startsAt);
      const end = parseDate(item.endsAt);
      if (!start || !end || end < start) return [];
      const pin =
        progressAnchor?.itemId === item.id
          ? ((differenceInCalendarDays(progressAnchor.date, progressAnchor.start) + 0.5) /
              (differenceInCalendarDays(progressAnchor.end, progressAnchor.start) + 1)) *
            100
          : null;
      return [
        {
          id: item.id,
          text: item.label,
          start,
          end: exclusiveEnd(end),
          type: "task",
          index,
          state: item.state,
          owner: item.owner,
          iconClassName: item.iconClassName,
          pin,
        },
      ];
    });
  }
  const tasks = tasksRef.current;

  /** Terapkan perubahan ke item, beri tahu pemanggil, dan tandai sudah tampil di SVAR. */
  const emitChange = (itemId: string, next: { startsAt: string; endsAt: string }) => {
    const nextItems = itemsRef.current.map((i) => (i.id === itemId ? { ...i, ...next } : i));
    shownRef.current = signatureOf(nextItems);
    onItemChangeRef.current?.(itemId, next.startsAt, next.endsAt);
  };

  const scrollTarget = progressAnchor?.date ?? (initialMonth ? startOfMonth(initialMonth) : null);

  const handleInit = (ganttApi: IApi) => {
    setApi(ganttApi);
    // Hanya penjadwalan ulang yang diizinkan: tanpa editor, tambah/hapus, link, atau urut baris
    for (const action of ["show-editor", "add-task", "delete-task", "add-link", "move-task"]) {
      ganttApi.intercept(action as "show-editor", () => false);
    }
    ganttApi.on("select-task", (ev: { id: string | number }) => setSelectedId(String(ev.id)));

    ganttApi.intercept("update-task", (ev) => {
      if (ev.eventSource === SELF_SOURCE) return true;
      // Batang tidak punya progress yang dapat diubah
      if (ev.diff === undefined || ev.inProgress) return ev.task.progress === undefined;
      const id = String(ev.id);
      const item = itemsRef.current.find((i) => i.id === id);
      const bounds = limitRef.current;
      if (!item || !bounds) return false;
      const next = clampChange(item, dragModeOf(ev.task), ev.diff, bounds);
      if (!next) return false;
      // Ganti payload relatif SVAR dengan tanggal absolut yang sudah dibatasi rentang proyek
      ev.task = { start: parseDate(next.startsAt)!, end: exclusiveEnd(parseDate(next.endsAt)!) };
      delete ev.diff;
      emitChange(id, next);
      return true;
    });

    if (scrollTarget) {
      const target = scrollTarget;
      setTimeout(() => ganttApi.exec("scroll-chart", { date: target }), 0);
    }
  };

  // Hapus pilihan bila item tidak lagi ada (mis. ganti tab data)
  useEffect(() => {
    if (selectedId && !items.some((i) => i.id === selectedId)) setSelectedId(null);
  }, [items, selectedId]);

  if (!timeline || !limit) {
    return (
      <div data-slot="gantt" className={cn("flex flex-col gap-4", className)}>
        <p className="rounded-md border border-border bg-surface px-6 py-8 text-center text-body-sm text-ink-muted">
          Timeline belum memiliki rentang tanggal yang valid.
        </p>
      </div>
    );
  }

  const today = new Date();
  const todayInRange = today >= timeline.start && today <= exclusiveEnd(timeline.end);
  const { scales, cellWidth } = getTimelineScales(granularity);
  const showMetaColumns = items.some((item) => item.owner !== undefined);

  const changeByKey = (itemId: string, mode: DragMode, delta: number) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    if (!item || !editable || !onItemChange) return;
    const next = clampChange(item, mode, delta, limit);
    if (!next || (next.startsAt === item.startsAt && next.endsAt === item.endsAt)) return;
    api?.exec("update-task", {
      id: itemId,
      task: { start: parseDate(next.startsAt)!, end: exclusiveEnd(parseDate(next.endsAt)!) },
      eventSource: SELF_SOURCE,
    });
    emitChange(itemId, next);
  };

  const taskById = (id: string) => tasks.find((t) => t.id === id);

  const pinAt = (task: GanttTask, x: number, y: number) => {
    if (!renderDetail) return;
    setHover(null);
    setPinned({ task, x, y });
  };

  // ←/→ pindah, Shift+←/→ tanggal selesai, Alt+←/→ tanggal mulai, Enter detail, Esc tutup
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setPinned(null);
      return;
    }
    if (!selectedId) return;
    if (event.key === "Enter" && !editable) {
      const task = taskById(selectedId);
      const node = event.currentTarget.querySelector(`.wx-bar[data-id="${selectedId}"]`);
      const rect = node?.getBoundingClientRect();
      if (task) pinAt(task, rect ? rect.left : 0, rect ? rect.bottom : 0);
      return;
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    const mode: DragMode = event.shiftKey ? "end" : event.altKey ? "start" : "move";
    changeByKey(selectedId, mode, event.key === "ArrowLeft" ? -1 : 1);
  };

  const locate = (event: { target: EventTarget | null; nativeEvent: Event }) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".wx-bar") || !api) return undefined;
    const located = locateTask(event.nativeEvent as MouseEvent, api);
    return located ? taskById(String(located.id)) : undefined;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Saat tombol ditekan (drag) tooltip disembunyikan agar tidak menutupi batang
    if (event.buttons !== 0 || pinned) {
      if (hover) setHover(null);
      return;
    }
    const task = locate(event);
    setHover(task ? { task, x: event.clientX, y: event.clientY } : null);
  };

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const task = locate(event);
    if (!task) {
      setPinned(null);
      return;
    }
    setSelectedId(task.id);
    if (!editable) pinAt(task, event.clientX, event.clientY);
  };

  const columns: IColumnConfig[] = showMetaColumns
    ? [
        { id: "index", header: "No", width: 44, cell: IndexCell },
        { id: "text", header: "Item", flexgrow: 1, width: 180, cell: LabelCell },
        ...(isWide ? [{ id: "owner", header: "Owner", width: 110, cell: OwnerCell }] : []),
      ]
    : [{ id: "text", header: "Stage", flexgrow: 1, width: isWide ? 200 : 150, cell: LabelCell }];
  const gridWidth = showMetaColumns ? (isWide ? 340 : 230) : isWide ? 200 : 150;

  // Kunci render ulang: SVAR menghitung ulang skala saat konfigurasi berubah
  const ganttKey = [
    colorScheme,
    isWide,
    editable,
    granularity,
    timeline.start.getTime(),
    timeline.end.getTime(),
    tasks.map((t) => t.id).join(","),
  ].join("|");

  const detail = pinned ?? hover;
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  return (
    <GanttItemsContext.Provider value={{ itemsById }}>
      <div data-slot="gantt" className={cn("flex flex-col gap-3", className)}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-caption text-ink-muted">
          <div className="flex items-center gap-2">
            <MoveHorizontal className="size-4 shrink-0" aria-hidden />
            <span>
              {editable
                ? "Geser batang untuk memindahkan stage, atau tarik ujungnya untuk mengubah durasi. Keyboard: pilih batang lalu ←/→ (Shift: tanggal selesai, Alt: tanggal mulai)."
                : "Geser horizontal untuk melihat seluruh periode proyek. Klik batang untuk melihat detail."}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4" aria-label="Legenda status kalender">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-surface-brand" aria-hidden />
                Selesai
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-xs bg-surface-inverse" aria-hidden />
                Belum selesai
              </span>
            </div>
            <div
              role="radiogroup"
              aria-label="Skala timeline"
              className="inline-flex h-9 items-center rounded-sm border border-border bg-surface p-0.5"
            >
              {GRANULARITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={granularity === option.value}
                  onClick={() => setGranularity(option.value)}
                  className={cn(
                    "h-full rounded-xs px-3 text-xs focus-ring transition-colors",
                    granularity === option.value
                      ? "bg-surface-inverse text-ink-inverse"
                      : "text-ink-secondary hover:text-ink",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="quiet"
              disabled={!todayInRange || !api}
              title={todayInRange ? undefined : "Hari ini di luar periode proyek"}
              onClick={() => api?.exec("scroll-chart", { date: new Date() })}
              className="h-9 gap-1.5 px-3 text-xs"
            >
              <CalendarCheck aria-hidden />
              Hari ini
            </Button>
          </div>
        </div>

        <div
          data-slot="gantt-viewport"
          data-editable={editable || undefined}
          role="region"
          aria-label="Timeline proyek lintas bulan"
          tabIndex={0}
          className="vapt-gantt min-w-0 overflow-hidden rounded-md border border-border bg-surface focus-ring"
          style={{ height: SCALE_HEIGHT * scales.length + CELL_HEIGHT * Math.max(tasks.length, 1) + 18 }}
          onKeyDownCapture={handleKeyDown}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
        >
          <Willow fonts={false}>
            <SvarGantt
              key={ganttKey}
              init={handleInit}
              readonly={!editable}
              tasks={tasks as unknown as ITask[]}
              scales={scales}
              start={timeline.start}
              end={exclusiveEnd(timeline.end)}
              autoScale={false}
              lengthUnit="day"
              cellWidth={granularity === "day" ? Math.max(cellWidth, 44) : cellWidth}
              cellHeight={CELL_HEIGHT}
              scaleHeight={SCALE_HEIGHT}
              columns={columns}
              gridWidth={gridWidth}
              taskTemplate={editable ? EditableBar : StageBar}
              highlightTime={(date, unit) => {
                if (unit !== granularity) return "";
                if (isCurrentPeriod(date, unit, today)) return TODAY_CELL_CLASS;
                return unit === "day" && isWeekend(date) ? WEEKEND_CELL_CLASS : "";
              }}
            />
          </Willow>
        </div>

        {detail && renderDetail ? (
          <GanttTooltip x={detail.x} y={detail.y} pinned={Boolean(pinned)} data-slot="gantt-detail">
            {itemsById.get(detail.task.id) ? renderDetail(itemsById.get(detail.task.id)!) : null}
          </GanttTooltip>
        ) : null}
      </div>
    </GanttItemsContext.Provider>
  );
}

/* ---------- Sel grid ---------- */

type CellProps = { row: unknown };
const asTask = (row: unknown) => row as GanttTask;

function IndexCell(props: CellProps) {
  return <span className="text-caption text-ink-muted tabular">{asTask(props.row).index + 1}</span>;
}

function LabelCell(props: CellProps) {
  const task = asTask(props.row);
  const { itemsById } = useContext(GanttItemsContext);
  const item = itemsById.get(task.id);
  const icon = item?.icon;
  const iconClassName = item?.iconClassName ?? task.iconClassName;
  return (
    <span className="flex min-w-0 items-center gap-2">
      {icon ? (
        <span
          aria-hidden
          data-slot="gantt-stage-icon"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-sm border-0 [&_svg]:size-3.5",
            iconClassName ?? "bg-surface-subtle text-ink-muted",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="truncate text-xs text-ink" title={task.text}>
        {task.text}
      </span>
    </span>
  );
}

function OwnerCell(props: CellProps) {
  const task = asTask(props.row);
  return (
    <span className="block truncate text-xs text-ink-secondary" title={task.owner ?? "-"}>
      {task.owner ?? "-"}
    </span>
  );
}

/* ---------- Batang ---------- */

function BarBody({ task, children }: { task: GanttTask; children?: ReactNode }) {
  return (
    <div
      data-slot="gantt-range"
      data-state={task.state}
      className={cn(
        "absolute inset-0 overflow-visible rounded-[inherit] border-l-[3px]",
        RANGE_STATE[task.state],
      )}
    >
      {/* Tanpa teks di batang: nama tahap ada di grid kiri dan tooltip */}
      {task.pin !== null ? (
        <span
          data-slot="gantt-progress-pin"
          title="Posisi progres saat ini"
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-surface-brand shadow-float"
          style={{ left: `${task.pin}%` }}
        />
      ) : null}
      {children}
    </div>
  );
}

function StageBar({ data }: { data: ITask }) {
  return <BarBody task={data as unknown as GanttTask} />;
}

/** Pegangan visual di kedua ujung; SVAR mendeteksi resize dari posisi pointer di tepi batang. */
function EditableBar({ data }: { data: ITask }) {
  const task = data as unknown as GanttTask;
  const grip =
    "absolute top-1/2 h-4 w-0.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-current opacity-60";
  return (
    <BarBody task={task}>
      <span aria-hidden data-slot="gantt-resize-start" className={cn(grip, "left-1")} />
      <span aria-hidden data-slot="gantt-resize-end" className={cn(grip, "right-1")} />
    </BarBody>
  );
}

export { Gantt, clampChange };
export type { GanttGranularity, GanttItem, GanttProps, GanttState };
