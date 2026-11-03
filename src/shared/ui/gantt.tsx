/**
 * Gantt lintas bulan. Kolom tahap tetap terlihat, sedangkan seluruh periode
 * proyek berada pada satu kanvas horizontal yang dapat digulir tanpa paging.
 */
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isWeekend,
  max,
  min,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { MoveHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type GanttState = "done" | "current" | "todo";

type GanttItem = {
  id: string;
  label: string;
  startsAt: string;
  endsAt: string;
  state: GanttState;
  icon?: ReactNode;
  iconClassName?: string;
};

const MIN_DAY_WIDTH = 44;
const ROW_HEIGHT = "h-14";
const MONTH_HEADER_HEIGHT = "h-10";
const DAY_HEADER_HEIGHT = "h-14";

const RANGE_STATE: Record<GanttState, string> = {
  done: "bg-surface-brand",
  current: "bg-surface-inverse",
  todo: "bg-surface-inverse",
};

type GanttProps = {
  items: readonly GanttItem[];
  /** Posisi awal scroll; default tanggal item paling awal. */
  initialMonth?: Date;
  renderDetail?: (item: GanttItem) => ReactNode;
  editable?: boolean;
  rangeStart?: string;
  rangeEnd?: string;
  onItemChange?: (itemId: string, startsAt: string, endsAt: string) => void;
  className?: string;
};

type DragMode = "move" | "start" | "end";

type DragSession = {
  item: GanttItem;
  mode: DragMode;
  pointerStartX: number;
  lastDelta: number;
};

function parseDate(value: string) {
  const parsed = startOfDay(new Date(value));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
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

function toDateValue(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function Gantt({
  items,
  initialMonth,
  renderDetail,
  editable = false,
  rangeStart,
  rangeEnd,
  onItemChange,
  className,
}: GanttProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const progressAnchor = useMemo(() => getProgressAnchor(items), [items]);
  const validDates = useMemo(() => {
    const itemDates = items.flatMap((item) => {
      const start = parseDate(item.startsAt);
      const end = parseDate(item.endsAt);
      return start && end && end >= start ? [start, end] : [];
    });
    const fixedRange = [parseDate(rangeStart ?? ""), parseDate(rangeEnd ?? "")].filter(
      (date): date is Date => Boolean(date),
    );
    return [...itemDates, ...fixedRange];
  }, [items, rangeEnd, rangeStart]);
  const timeline = useMemo(() => {
    if (validDates.length === 0) return null;

    const start = startOfMonth(min(validDates));
    const end = endOfMonth(max(validDates));
    const days = eachDayOfInterval({ start, end });
    const months = eachMonthOfInterval({ start, end }).map((month) => {
      const monthStart = max([start, startOfMonth(month)]);
      const monthEnd = min([end, endOfMonth(month)]);
      const startColumn = differenceInCalendarDays(monthStart, start) + 1;
      const dayCount = differenceInCalendarDays(monthEnd, monthStart) + 1;

      return {
        date: month,
        startColumn,
        endColumn: startColumn + dayCount,
      };
    });

    return { start, end, days, months };
  }, [validDates]);
  const initialMonthTime = initialMonth?.getTime();
  const timelineStartTime = timeline?.start.getTime();
  const timelineEndTime = timeline?.end.getTime();

  const changeItemByDays = (item: GanttItem, mode: DragMode, delta: number) => {
    if (!timeline || !onItemChange) return;

    const itemStart = parseDate(item.startsAt);
    const itemEnd = parseDate(item.endsAt);
    if (!itemStart || !itemEnd) return;

    const limitStart = parseDate(rangeStart ?? "") ?? timeline.start;
    const limitEnd = parseDate(rangeEnd ?? "") ?? timeline.end;
    let nextStart = itemStart;
    let nextEnd = itemEnd;

    if (mode === "start") {
      nextStart = min([itemEnd, max([limitStart, addDays(itemStart, delta)])]);
    } else if (mode === "end") {
      nextEnd = max([itemStart, min([limitEnd, addDays(itemEnd, delta)])]);
    } else {
      nextStart = addDays(itemStart, delta);
      nextEnd = addDays(itemEnd, delta);
      if (nextStart < limitStart) {
        nextEnd = addDays(nextEnd, differenceInCalendarDays(limitStart, nextStart));
        nextStart = limitStart;
      }
      if (nextEnd > limitEnd) {
        nextStart = addDays(nextStart, differenceInCalendarDays(limitEnd, nextEnd));
        nextEnd = limitEnd;
      }
    }

    onItemChange(item.id, toDateValue(nextStart), toDateValue(nextEnd));
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    item: GanttItem,
    mode: DragMode,
  ) => {
    if (!editable || !onItemChange) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { item, mode, pointerStartX: event.clientX, lastDelta: 0 };
    setDraggingId(item.id);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || !timeline || !viewportRef.current) return;

    const dayWidth = Math.max(
      MIN_DAY_WIDTH,
      viewportRef.current.scrollWidth / timeline.days.length,
    );
    const delta = Math.round((event.clientX - drag.pointerStartX) / dayWidth);
    if (delta === drag.lastDelta) return;

    drag.lastDelta = delta;
    changeItemByDays(drag.item, drag.mode, delta);
  };

  const stopDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDraggingId(null);
  };

  const handleEditKey = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    item: GanttItem,
    mode: DragMode,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    changeItemByDays(item, mode, event.key === "ArrowLeft" ? -1 : 1);
  };

  useLayoutEffect(() => {
    if (!timeline || !viewportRef.current) return;

    const requested = progressAnchor?.date ?? startOfMonth(initialMonth ?? timeline.start);
    const clamped = min([timeline.end, max([timeline.start, requested])]);
    const dayOffset = differenceInCalendarDays(clamped, timeline.start);
    const dayWidth = Math.max(
      MIN_DAY_WIDTH,
      viewportRef.current.scrollWidth / timeline.days.length,
    );
    const centeredOffset =
      dayOffset * dayWidth + dayWidth / 2 - viewportRef.current.clientWidth / 2;
    viewportRef.current.scrollLeft = Math.max(0, centeredOffset);
  }, [initialMonthTime, progressAnchor, timelineEndTime, timelineStartTime]);

  if (!timeline) {
    return (
      <div data-slot="gantt" className={cn("flex flex-col gap-4", className)}>
        <p className="rounded-md border border-border bg-surface px-6 py-8 text-center text-body-sm text-ink-muted">
          Timeline belum memiliki rentang tanggal yang valid.
        </p>
      </div>
    );
  }

  const columnsFor = (item: GanttItem) => {
    const itemStart = parseDate(item.startsAt);
    const itemEnd = parseDate(item.endsAt);
    if (!itemStart || !itemEnd || itemEnd < itemStart) return null;

    const clippedStart = max([timeline.start, itemStart]);
    const clippedEnd = min([timeline.end, itemEnd]);
    return {
      start: differenceInCalendarDays(clippedStart, timeline.start) + 1,
      end: differenceInCalendarDays(clippedEnd, timeline.start) + 1,
    };
  };
  const today = startOfDay(new Date());

  return (
    <div data-slot="gantt" className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-caption text-ink-muted">
        <div className="flex items-center gap-2">
          <MoveHorizontal className="size-4 shrink-0" aria-hidden />
          <span>
            {editable
              ? "Geser batang untuk memindahkan tahap, atau tarik ujungnya untuk mengubah durasi."
              : "Geser horizontal untuk melihat seluruh periode proyek."}
          </span>
        </div>
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
      </div>

      <div className="grid grid-cols-[minmax(9rem,12rem)_minmax(0,1fr)] overflow-hidden rounded-sm border border-border">
        <div data-slot="gantt-labels" className="z-base border-r border-border bg-surface">
          <div className="flex h-24 items-end px-4 pb-4 text-caption text-ink-muted">Tahap</div>
          {items.map((item) => (
            <div
              key={`label-${item.id}`}
              className="flex h-14 min-w-0 items-center gap-3 border-t border-border px-3 sm:px-4"
            >
              {item.icon ? (
                <span
                  aria-hidden
                  data-slot="gantt-stage-icon"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-xs [&_svg]:size-3.5",
                    item.iconClassName ?? "bg-surface-subtle text-ink-muted",
                  )}
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="truncate text-body-sm text-ink" title={item.label}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div
          ref={viewportRef}
          data-slot="gantt-viewport"
          role="region"
          aria-label="Timeline proyek lintas bulan"
          tabIndex={0}
          className="overflow-x-auto overscroll-x-contain focus-ring"
        >
          <div
            data-slot="gantt-canvas"
            className="grid min-w-max bg-surface"
            style={{
              minWidth: `${timeline.days.length * MIN_DAY_WIDTH}px`,
              gridTemplateColumns: `repeat(${timeline.days.length}, minmax(${MIN_DAY_WIDTH}px, 1fr))`,
              gridTemplateRows: `2.5rem 3.5rem repeat(${items.length}, 3.5rem)`,
            }}
          >
            {timeline.months.map((month) => (
              <div
                key={month.date.toISOString()}
                style={{
                  gridColumn: `${month.startColumn} / ${month.endColumn}`,
                  gridRow: 1,
                }}
                className={cn(
                  MONTH_HEADER_HEIGHT,
                  "z-base relative flex items-center border-l border-border bg-surface-subtle px-3 first:border-l-0",
                )}
              >
                <span className="sticky left-3 text-caption font-medium text-ink">
                  {format(month.date, "MMMM yyyy", { locale: localeId })}
                </span>
              </div>
            ))}

            {timeline.days.map((day, index) => (
              <div
                key={`column-${day.toISOString()}`}
                aria-hidden
                style={{ gridColumn: index + 1, gridRow: `2 / -1` }}
                className={cn(
                  "border-l border-border",
                  isWeekend(day) && "bg-surface-subtle",
                  isSameDay(day, today) && "border-l-brand",
                )}
              />
            ))}

            {timeline.days.map((day, index) => (
              <div
                key={`day-${day.toISOString()}`}
                style={{ gridColumn: index + 1, gridRow: 2 }}
                className={cn(
                  DAY_HEADER_HEIGHT,
                  "z-base flex flex-col items-center justify-center gap-1 bg-surface px-1",
                  isWeekend(day) && "bg-surface-subtle",
                )}
              >
                <span className="text-caption text-ink-muted">
                  {format(day, "EEEEEE", { locale: localeId })}
                </span>
                <span
                  className={cn(
                    "text-body-sm tabular",
                    isSameDay(day, today) ? "font-medium text-brand" : "text-ink-secondary",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            ))}

            {items.map((item, index) => (
              <div
                key={`track-${item.id}`}
                aria-hidden
                style={{ gridColumn: `1 / -1`, gridRow: index + 3 }}
                className={cn(ROW_HEIGHT, "border-t border-border")}
              />
            ))}

            {items.map((item, index) => {
              const columns = columnsFor(item);
              if (!columns) return null;
              const anchorPosition =
                progressAnchor?.itemId === item.id
                  ? ((differenceInCalendarDays(progressAnchor.date, progressAnchor.start) + 0.5) /
                      (differenceInCalendarDays(progressAnchor.end, progressAnchor.start) + 1)) *
                    100
                  : null;

              return (
                <div
                  key={item.id}
                  style={{
                    gridColumn: `${columns.start} / ${columns.end + 1}`,
                    gridRow: index + 3,
                  }}
                  className={cn(ROW_HEIGHT, "z-base flex items-center px-1")}
                >
                  {editable ? (
                    <div
                      data-state={item.state}
                      data-dragging={draggingId === item.id || undefined}
                      className="relative h-10 w-full select-none"
                    >
                      <span
                        aria-hidden
                        data-slot="gantt-range"
                        className={cn(
                          "pointer-events-none absolute top-1/2 right-2 left-2 h-10 -translate-y-1/2 rounded-sm",
                          RANGE_STATE[item.state],
                        )}
                      >
                        {anchorPosition !== null ? (
                          <span
                            data-slot="gantt-progress-pin"
                            title="Posisi progres saat ini"
                            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-surface-brand shadow-float"
                            style={{ left: `${anchorPosition}%` }}
                          />
                        ) : null}
                      </span>
                      <button
                        type="button"
                        data-slot="gantt-drag-surface"
                        aria-label={item.label}
                        title={`${item.label}: ${toDateValue(parseDate(item.startsAt)!)} - ${toDateValue(parseDate(item.endsAt)!)}`}
                        className={cn(
                          "absolute inset-y-0 right-4 left-4 cursor-grab touch-none rounded-xs focus-ring active:cursor-grabbing",
                          draggingId === item.id && "cursor-grabbing",
                        )}
                        onPointerDown={(event) => startDrag(event, item, "move")}
                        onPointerMove={moveDrag}
                        onPointerUp={stopDrag}
                        onPointerCancel={stopDrag}
                        onKeyDown={(event) => handleEditKey(event, item, "move")}
                      />
                      <button
                        type="button"
                        data-slot="gantt-resize-start"
                        aria-label={`Ubah tanggal mulai ${item.label}`}
                        className="absolute top-1/2 left-1.5 flex h-8 w-3 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-xs focus-ring before:h-4 before:w-0.5 before:rounded-full before:bg-surface"
                        onPointerDown={(event) => startDrag(event, item, "start")}
                        onPointerMove={moveDrag}
                        onPointerUp={stopDrag}
                        onPointerCancel={stopDrag}
                        onKeyDown={(event) => handleEditKey(event, item, "start")}
                      />
                      <button
                        type="button"
                        data-slot="gantt-resize-end"
                        aria-label={`Ubah tanggal selesai ${item.label}`}
                        className="absolute top-1/2 right-1.5 flex h-8 w-3 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-xs focus-ring before:h-4 before:w-0.5 before:rounded-full before:bg-surface"
                        onPointerDown={(event) => startDrag(event, item, "end")}
                        onPointerMove={moveDrag}
                        onPointerUp={stopDrag}
                        onPointerCancel={stopDrag}
                        onKeyDown={(event) => handleEditKey(event, item, "end")}
                      />
                    </div>
                  ) : (
                    <Popover>
                      <PopoverTrigger
                        data-state={item.state}
                        aria-label={item.label}
                        className={cn(
                          "relative flex h-10 w-full items-center rounded-sm px-1 focus-ring",
                          "transition-opacity duration-150 ease-out hover:opacity-75",
                        )}
                      >
                        <span
                          aria-hidden
                          data-slot="gantt-range"
                          className={cn(
                            "absolute top-1/2 right-2 left-2 h-10 -translate-y-1/2 rounded-sm",
                            RANGE_STATE[item.state],
                          )}
                        >
                          {anchorPosition !== null ? (
                            <span
                              data-slot="gantt-progress-pin"
                              title="Posisi progres saat ini"
                              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-surface-brand shadow-float"
                              style={{ left: `${anchorPosition}%` }}
                            />
                          ) : null}
                        </span>
                      </PopoverTrigger>
                      {renderDetail ? (
                        <PopoverContent align="start">{renderDetail(item)}</PopoverContent>
                      ) : null}
                    </Popover>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { Gantt };
export type { GanttItem, GanttProps, GanttState };
