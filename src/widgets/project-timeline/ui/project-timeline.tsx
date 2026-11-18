import { Gantt, Willow, locateTask } from "@svar-ui/react-gantt";
import type { IApi, IColumnConfig, ITask } from "@svar-ui/react-gantt";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowUpDown,
  CalendarCheck,
  CalendarX2,
  FolderKanban,
  Layers,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { Link, useNavigate } from "react-router";
import type { Project } from "@/entities/project";
import { ProjectStatusBadge, shiftDateRange } from "@/entities/project";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { getDefaultScheduleRangeValue } from "@/features/schedule-range";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { FacetFilter, SingleSelectFilter } from "@/shared/ui/facet-filter";
import { SearchInput } from "@/shared/ui/input";
import { Pagination } from "@/shared/ui/pagination";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  GanttTooltip,
  TODAY_CELL_CLASS,
  exclusiveEnd,
  getTimelineScales,
  isCurrentPeriod,
  useColorScheme,
  useMediaQuery,
} from "@/shared/ui/svar-gantt";
import { GROUP_BAR_CLASS, statusBarClass } from "../model/status-colors";
import {
  DEFAULT_TIMELINE_FILTERS,
  DEFAULT_TIMELINE_PAGE_SIZE,
  GROUP_BY_OPTIONS,
  SORT_OPTIONS,
  TIMELINE_PAGE_SIZE_OPTIONS,
  buildTimelineTasks,
  filterTimelineProjects,
  getTimelinePmOptions,
  getTimelineStatusOptions,
  paginate,
  partitionScheduled,
  sortTimelineProjects,
  type TimelineFilters,
  type TimelineTask,
} from "../model/timeline-tasks";

const CELL_HEIGHT = 48;
const SCALE_HEIGHT = 32;
const MIN_CHART_HEIGHT = 560;
const DEFAULT_CHART_HEIGHT = "calc(100vh - 380px)";

const fmtDate = (date: Date) => format(date, "d MMM yyyy", { locale: idLocale });

interface ProjectTimelineProps {
  /** Data proyek dari kueri halaman (GET /projects) — widget tidak membuat request sendiri. */
  projects: Project[];
  schedule: ScheduleRangeValue;
  onScheduleChange: (next: ScheduleRangeValue) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

/** Gantt tingkat proyek (hanya-baca) berbasis SVAR React Gantt (MIT). */
export function ProjectTimeline({
  projects,
  schedule,
  onScheduleChange,
  isLoading = false,
  error,
  onRetry,
}: ProjectTimelineProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TimelineFilters>(DEFAULT_TIMELINE_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TIMELINE_PAGE_SIZE);
  const [api, setApi] = useState<IApi | undefined>(undefined);
  // Grup yang diciutkan disimpan agar bertahan saat Gantt dirender ulang
  const collapsedRef = useRef<Set<string>>(new Set());
  const scrollToTodayRef = useRef(false);

  const { granularity, range } = schedule;
  const colorScheme = useColorScheme();
  // Layar sempit: grid hanya kolom Proyek agar area chart tetap terlihat
  const isWide = useMediaQuery("(min-width: 768px)");

  const { scheduled, unscheduledCount } = useMemo(() => partitionScheduled(projects), [projects]);
  const statusOptions = useMemo(() => getTimelineStatusOptions(scheduled), [scheduled]);
  const pmOptions = useMemo(() => getTimelinePmOptions(scheduled), [scheduled]);

  const visible = useMemo(
    () => sortTimelineProjects(filterTimelineProjects(scheduled, filters, range), filters.sort),
    [scheduled, filters, range],
  );
  // Data dimemo agar Gantt tidak menerima array baru di setiap render (scroll tetap)
  const paged = useMemo(() => paginate(visible, page, pageSize), [visible, page, pageSize]);
  const tasks = useMemo(() => {
    const realTasks = buildTimelineTasks(paged.items, filters.groupBy, collapsedRef.current);
    if (realTasks.length === 0 || realTasks.length >= pageSize) return realTasks;
    const padded = [...realTasks];
    for (let i = realTasks.length; i < pageSize; i++) {
      padded.push({
        id: `empty:${i}`,
        text: "",
        start: range.start,
        end: range.start,
        endInclusive: range.start,
        type: "task",
        kind: "empty",
      });
    }
    return padded;
  }, [paged.items, filters.groupBy, pageSize, range.start]);

  const { scales, cellWidth } = getTimelineScales(granularity);
  const isFiltered =
    filters.search.trim() !== "" || filters.statuses.length > 0 || filters.pms.length > 0;

  const update = (patch: Partial<TimelineFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  // Default setinggi layar perangkat agar memenuhi area layar meskipun data sedikit
  const chartHeight = DEFAULT_CHART_HEIGHT;

  const today = new Date();
  const todayInRange = today >= range.start && today <= exclusiveEnd(range.end);

  const handleInit = (ganttApi: IApi) => {
    setApi(ganttApi);
    ganttApi.on("open-task", (ev: { id: string | number; mode: boolean }) => {
      const id = String(ev.id);
      if (ev.mode) collapsedRef.current.delete(id);
      else collapsedRef.current.add(id);
    });
    // Saat pertama dibuka (atau setelah "Hari ini"), geser ke periode sekarang
    const now = new Date();
    if (now >= range.start && now <= exclusiveEnd(range.end)) {
      scrollToTodayRef.current = false;
      setTimeout(() => ganttApi.exec("scroll-chart", { date: now }), 0);
    }
  };

  const handleToday = () => {
    if (todayInRange && api) {
      api.exec("scroll-chart", { date: new Date() });
      return;
    }
    // Hari ini di luar rentang: pindah ke rentang default (tahun berjalan)
    scrollToTodayRef.current = true;
    onScheduleChange({ ...getDefaultScheduleRangeValue(), granularity });
  };

  // Tooltip mengikuti kursor (fixed) — tooltip bawaan SVAR ter-portal ke root tema
  // sehingga posisinya meleset di dalam layout dashboard.
  const [hover, setHover] = useState<{ task: TimelineTask; x: number; y: number } | null>(null);
  const handleChartPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const located = target.closest(".wx-bar") && api ? locateTask(event.nativeEvent, api) : null;
    const task =
      located && api ? (api.getTask(located.id) as unknown as TimelineTask | undefined) : undefined;
    setHover(task && task.kind !== "empty" ? { task, x: event.clientX, y: event.clientY } : null);
  };

  // Klik batang proyek → halaman detail proyek. Batang grup → ciutkan/buka.
  const handleChartClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".wx-bar")) return;
    const located = locateTask(event.nativeEvent, api);
    if (!located || !api) return;
    const task = api.getTask(located.id) as unknown as TimelineTask | undefined;
    if (!task || task.kind === "empty") return;
    if (task.kind === "project" && task.projectId !== undefined) {
      navigate(`/projects/${task.projectId}`);
    } else if (task.kind === "group") {
      api.exec("open-task", { id: located.id, mode: !task.open });
    }
  };

  const columns = useMemo<IColumnConfig[]>(
    () =>
      isWide
        ? [
            { id: "text", header: "Proyek", flexgrow: 1, width: 200, cell: NameCell },
            { id: "client", header: "Klien", width: 130, cell: ClientCell },
            { id: "statusName", header: "Status", width: 140, cell: StatusCell },
          ]
        : [{ id: "text", header: "Proyek", width: 150, cell: NameCell }],
    [isWide],
  );

  // Kunci render ulang: SVAR menghitung ulang skala & pohon saat konfigurasi berubah
  const ganttKey = [
    colorScheme,
    isWide,
    granularity,
    range.start.getTime(),
    range.end.getTime(),
    filters.groupBy,
    tasks.map((t) => t.id).join(","),
  ].join("|");

  return (
    <div data-slot="project-timeline" className="vapt-gantt flex flex-col gap-4">
      {/* Toolbar: pencarian kiri, filter & pengaturan kanan */}
      <div
        role="search"
        aria-label="Filter timeline proyek"
        className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <SearchInput
            aria-label="Cari proyek di timeline"
            placeholder="Cari nama proyek atau klien"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="h-9 sm:w-72"
          />
          <p
            aria-live="polite"
            className="shrink-0 text-xs whitespace-nowrap text-ink-muted tabular-nums"
          >
            {visible.length} proyek pada rentang ini
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {isFiltered ? (
            <Button
              type="button"
              variant="quiet"
              onClick={() => update({ search: "", statuses: [], pms: [] })}
              className="h-9 gap-1.5 px-2.5 text-xs"
            >
              <X aria-hidden />
              Reset filter
            </Button>
          ) : null}
          <FacetFilter
            title="Status"
            options={statusOptions}
            selected={filters.statuses}
            onChange={(statuses) => update({ statuses })}
          />
          <FacetFilter
            title="PM"
            icon={<UserRound />}
            options={pmOptions}
            selected={filters.pms}
            onChange={(pms) => update({ pms })}
            emptyText="Belum ada data PM"
          />
          <SingleSelectFilter
            title="Grup"
            icon={<Layers />}
            options={GROUP_BY_OPTIONS}
            value={filters.groupBy}
            defaultValue="none"
            onChange={(groupBy) => {
              collapsedRef.current = new Set();
              update({ groupBy });
            }}
          />
          <SingleSelectFilter
            title="Urutkan"
            icon={<ArrowUpDown />}
            options={SORT_OPTIONS}
            value={filters.sort}
            alwaysShowValue
            onChange={(sort) => update({ sort })}
          />
          <Button
            type="button"
            variant="quiet"
            onClick={handleToday}
            className="h-9 gap-1.5 px-3 text-xs"
          >
            <CalendarCheck aria-hidden />
            Hari ini
          </Button>
        </div>
      </div>

      {error ? (
        <Alert
          tone="error"
          title="Gagal memuat timeline proyek"
          action={
            onRetry ? (
              <Button type="button" variant="quiet" onClick={onRetry} className="h-8 text-xs">
                Coba lagi
              </Button>
            ) : undefined
          }
        >
          {error.message}
        </Alert>
      ) : null}

      <div className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
        {isLoading ? (
          <div
            data-slot="project-timeline-loading"
            className="flex flex-col gap-3 p-6"
            style={{ height: chartHeight, minHeight: MIN_CHART_HEIGHT }}
            aria-busy="true"
          >
            <span className="sr-only">Memuat timeline proyek</span>
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<CalendarX2 />}
            title="Timeline belum dapat ditampilkan"
            description="Muat ulang data proyek untuk mencoba lagi."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<FolderKanban />}
            title={
              isFiltered
                ? "Tidak ada proyek yang cocok"
                : "Tidak ada proyek terjadwal pada rentang ini"
            }
            description={
              isFiltered
                ? "Coba ubah kata kunci atau kurangi filter yang aktif."
                : "Geser rentang data atau pilih rentang lain di atas."
            }
            action={
              isFiltered ? (
                <Button
                  variant="quiet"
                  onClick={() => update({ search: "", statuses: [], pms: [] })}
                >
                  Reset filter
                </Button>
              ) : (
                <Button
                  variant="quiet"
                  onClick={() => onScheduleChange({ ...schedule, range: shiftDateRange(range, 1) })}
                >
                  Rentang berikutnya
                </Button>
              )
            }
          />
        ) : (
          <div
            data-slot="project-timeline-chart"
            style={{ height: chartHeight, minHeight: MIN_CHART_HEIGHT }}
            onClick={handleChartClick}
            onPointerMove={handleChartPointerMove}
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
                cellWidth={cellWidth}
                cellHeight={CELL_HEIGHT}
                scaleHeight={SCALE_HEIGHT}
                columns={columns}
                gridWidth={isWide ? 470 : 150}
                // Mode ringkas SVAR (layar sempit) menampilkan chart lebih dulu;
                // grid tetap bisa dibuka lewat tombol bawaan SVAR
                displayMode={isWide ? "all" : "chart"}
                taskTemplate={TimelineBar}
                highlightTime={(date, unit) =>
                  // Hanya sel interval aktif yang disorot, bukan baris skala konteks
                  unit === granularity && isCurrentPeriod(date, unit, today) ? TODAY_CELL_CLASS : ""
                }
              />
            </Willow>
            {hover ? <TimelineTooltip {...hover} /> : null}
          </div>
        )}
      </div>

      {!isLoading && !error && visible.length > 0 ? (
        <Pagination
          page={paged.page}
          pageCount={paged.pageCount}
          total={visible.length}
          pageSize={pageSize}
          noun="proyek"
          onPageChange={setPage}
          pageSizeOptions={[...TIMELINE_PAGE_SIZE_OPTIONS]}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          className="pt-0"
        />
      ) : null}

      {!isLoading && unscheduledCount > 0 ? (
        <p className="text-xs text-ink-muted">
          {unscheduledCount} proyek belum memiliki jadwal valid (tanggal mulai/selesai kosong) dan
          tidak ditampilkan di timeline.
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Sel grid ---------- */

/** SVAR memberi `row` bertipe umum; isinya adalah TimelineTask yang kita kirim. */
type CellProps = { row: unknown };
const asTask = (row: unknown) => row as TimelineTask;

function NameCell(props: CellProps) {
  const row = asTask(props.row);
  if (row.kind === "empty") return null;
  if (row.kind === "group") {
    return (
      <span className="flex min-w-0 items-center gap-2 text-xs text-ink">
        <span className="truncate">{row.text}</span>
        <span className="shrink-0 text-ink-muted tabular-nums">{row.childCount}</span>
      </span>
    );
  }
  return (
    <Link
      to={`/projects/${row.projectId}`}
      onClick={(e) => e.stopPropagation()}
      className="block truncate rounded-xs text-xs text-ink focus-ring hover:text-brand"
      title={row.text}
    >
      {row.text}
    </Link>
  );
}

function ClientCell(props: CellProps) {
  const row = asTask(props.row);
  if (row.kind === "group" || row.kind === "empty") return null;
  return <span className="block truncate text-xs text-ink-secondary">{row.client || "-"}</span>;
}

function StatusCell(props: CellProps) {
  const row = asTask(props.row);
  if (row.kind === "group" || row.kind === "empty") return null;
  return <ProjectStatusBadge name={row.statusName} />;
}

/* ---------- Batang & tooltip ---------- */

function TimelineBar({ data }: { data: ITask }) {
  const task = data as unknown as TimelineTask;
  if (task.kind === "empty") return null;
  const isGroup = task.kind === "group";
  return (
    <div
      data-slot="project-timeline-bar"
      className={cn(
        "absolute inset-0 flex items-center overflow-hidden rounded-[inherit] border-l-[3px] px-2 text-xs",
        isGroup ? GROUP_BAR_CLASS : statusBarClass(task.statusName),
      )}
    >
      <span className="truncate">{task.text}</span>
    </div>
  );
}

function TimelineTooltip({ task, x, y }: { task: TimelineTask; x: number; y: number }) {
  return (
    <GanttTooltip x={x} y={y} data-slot="project-timeline-tooltip">
      <p className="truncate text-sm text-ink">{task.text}</p>
      {task.kind === "group" ? (
        <p className="mt-1 text-ink-muted">{task.childCount} proyek</p>
      ) : (
        <p className="mt-0.5 truncate text-ink-muted">{task.client || "-"}</p>
      )}
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        <dt className="text-ink-muted">Mulai</dt>
        <dd className="text-right tabular-nums">{fmtDate(task.start)}</dd>
        <dt className="text-ink-muted">Selesai</dt>
        <dd className="text-right tabular-nums">{fmtDate(task.endInclusive)}</dd>
        {task.kind === "project" ? (
          <>
            <dt className="text-ink-muted">Status</dt>
            <dd className="text-right">{task.statusName}</dd>
            <dt className="text-ink-muted">PM</dt>
            <dd className="truncate text-right">{task.pmName}</dd>
          </>
        ) : null}
      </dl>
    </GanttTooltip>
  );
}
