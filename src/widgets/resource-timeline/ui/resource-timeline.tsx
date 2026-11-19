import { Gantt, Willow, locateTask } from "@svar-ui/react-gantt";
import type { IApi, IColumnConfig, ITask } from "@svar-ui/react-gantt";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CalendarCheck,
  FolderKanban,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { useNavigate } from "react-router";
import { getProjectStatusStyle, type ProjectDetail } from "@/entities/project";
import { RoleBadge, type User } from "@/entities/user";
import type { ScheduleRangeValue } from "@/features/schedule-range";
import { getDefaultScheduleRangeValue } from "@/features/schedule-range";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { FacetFilter } from "@/shared/ui/facet-filter";
import { SearchInput } from "@/shared/ui/input";
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
import {
  DEFAULT_RESOURCE_TIMELINE_FILTERS,
  buildResourceTimelineTasks,
  type ResourceTimelineFilters,
  type ResourceTimelineTask,
} from "../model/resource-timeline-tasks";
import { assignmentBarClass } from "../model/status-colors";

const CELL_HEIGHT = 44;
const SCALE_HEIGHT = 32;
const MIN_CHART_HEIGHT = 500;
const DEFAULT_CHART_HEIGHT = "calc(100vh - 360px)";

const fmtDate = (date: Date) => format(date, "d MMM yyyy", { locale: idLocale });

const ROLE_OPTIONS = [
  { value: "pentester", label: "Pentester" },
  { value: "technical_writer", label: "Technical Writer" },
  { value: "project_manager", label: "Project Manager" },
];

interface ResourceTimelineProps {
  users: readonly User[];
  projects: readonly ProjectDetail[];
  schedule: ScheduleRangeValue;
  onScheduleChange: (next: ScheduleRangeValue) => void;
  loadMap?: Record<number, { mandays?: number }>;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function ResourceTimeline({
  users,
  projects,
  schedule,
  onScheduleChange,
  loadMap = {},
  isLoading = false,
  error,
  onRetry,
}: ResourceTimelineProps) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ResourceTimelineFilters>(
    DEFAULT_RESOURCE_TIMELINE_FILTERS,
  );
  const [api, setApi] = useState<IApi | undefined>(undefined);
  const collapsedRef = useRef<Set<string>>(new Set());

  const { granularity, range } = schedule;
  const colorScheme = useColorScheme();
  const isWide = useMediaQuery("(min-width: 768px)");

  const tasks = useMemo(
    () =>
      buildResourceTimelineTasks(
        users,
        projects,
        filters,
        range,
        collapsedRef.current,
        loadMap,
      ),
    [users, projects, filters, range, loadMap],
  );

  const { scales, cellWidth } = useMemo(
    () => getTimelineScales(granularity),
    [granularity],
  );

  const today = useMemo(() => new Date(), []);
  const todayInRange = today >= range.start && today <= range.end;

  const handleInit = (ganttApi: IApi) => {
    setApi(ganttApi);
    ganttApi.on("open-task", (ev: { id: string | number; mode: boolean }) => {
      const id = String(ev.id);
      if (ev.mode) collapsedRef.current.delete(id);
      else collapsedRef.current.add(id);
    });

    const now = new Date();
    if (now >= range.start && now <= exclusiveEnd(range.end)) {
      setTimeout(() => ganttApi.exec("scroll-chart", { date: now }), 0);
    }
  };

  const handleToday = () => {
    if (todayInRange && api) {
      api.exec("scroll-chart", { date: new Date() });
      return;
    }
    onScheduleChange({ ...getDefaultScheduleRangeValue(), granularity });
  };

  // Tooltip
  const [hover, setHover] = useState<{
    task: ResourceTimelineTask;
    x: number;
    y: number;
  } | null>(null);

  const handleChartPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const located = target.closest(".wx-bar") && api ? locateTask(event.nativeEvent, api) : null;
    const task =
      located && api
        ? (api.getTask(located.id) as unknown as ResourceTimelineTask | undefined)
        : undefined;
    setHover(task && task.kind !== "empty" ? { task, x: event.clientX, y: event.clientY } : null);
  };

  const handleChartClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest(".wx-bar")) return;
    const located = locateTask(event.nativeEvent, api);
    if (!located || !api) return;
    const task = api.getTask(located.id) as unknown as ResourceTimelineTask | undefined;
    if (!task || task.kind === "empty") return;

    if (task.kind === "assignment" && task.projectId !== undefined) {
      navigate(`/projects/${task.projectId}`);
    } else if (task.kind === "user") {
      api.exec("open-task", { id: located.id, mode: !task.open });
    }
  };

  const isFiltered =
    Boolean(filters.search) || filters.roles.length > 0;

  const updateFilters = (patch: Partial<ResourceTimelineFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const columns = useMemo<IColumnConfig[]>(
    () =>
      isWide
        ? [
            {
              id: "text",
              header: "Resource & Penugasan",
              flexgrow: 1,
              width: 240,
              cell: NameAndProjectCell,
            },
            { id: "roleOrStatus", header: "Role / Status", width: 140, cell: RoleStatusCell },
            { id: "mandays", header: "Mandays", width: 90, cell: MandaysCell },
          ]
        : [{ id: "text", header: "Resource", width: 160, cell: NameAndProjectCell }],
    [isWide],
  );

  const ganttKey = [
    colorScheme,
    granularity,
    range.start.toISOString(),
    range.end.toISOString(),
    isWide ? "wide" : "narrow",
  ].join(":");

  return (
    <div
      data-slot="resource-timeline"
      className="vapt-gantt flex flex-col gap-4"
      data-theme={colorScheme}
    >
      {/* Toolbar Filter */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            aria-label="Cari personil atau proyek"
            placeholder="Cari personil atau proyek..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full sm:w-64"
          />
          <p
            role="status"
            aria-live="polite"
            className="shrink-0 text-xs whitespace-nowrap text-ink-muted tabular-nums"
          >
            {tasks.filter((t) => t.kind === "user").length} personil
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {isFiltered ? (
            <Button
              type="button"
              variant="quiet"
              onClick={() =>
                setFilters({ search: "", roles: [] })
              }
              className="h-9 gap-1.5 px-2.5 text-xs"
            >
              <X aria-hidden />
              Reset filter
            </Button>
          ) : null}

          <FacetFilter
            title="Role"
            icon={<ShieldCheck className="size-3.5" />}
            options={ROLE_OPTIONS}
            selected={filters.roles}
            onChange={(roles) => updateFilters({ roles })}
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
          title="Gagal memuat timeline resource"
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
            data-slot="resource-timeline-loading"
            className="flex flex-col gap-3 p-6"
            style={{ height: DEFAULT_CHART_HEIGHT, minHeight: MIN_CHART_HEIGHT }}
            aria-busy="true"
          >
            <span className="sr-only">Memuat timeline resource</span>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Tidak ada penugasan atau resource yang sesuai"
            description={
              isFiltered
                ? "Coba sesuaikan kata kunci pencarian atau filter role/kapasitas."
                : "Belum ada alokasi penugasan proyek pada rentang ini."
            }
            action={
              isFiltered ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({ search: "", roles: [] })
                  }
                >
                  Reset filter
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div
            data-slot="resource-timeline-chart"
            style={{ height: DEFAULT_CHART_HEIGHT, minHeight: MIN_CHART_HEIGHT }}
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
                gridWidth={isWide ? 470 : 160}
                displayMode={isWide ? "all" : "chart"}
                taskTemplate={ResourceTimelineBar}
                highlightTime={(date, unit) =>
                  unit === granularity && isCurrentPeriod(date, unit, today)
                    ? TODAY_CELL_CLASS
                    : ""
                }
              />
            </Willow>

            {hover ? <ResourceTooltip {...hover} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Komponen Sel Grid SVAR ---------- */

type CellProps = { row: unknown };
const asTask = (row: unknown) => row as ResourceTimelineTask;

function NameAndProjectCell(props: CellProps) {
  const row = asTask(props.row);
  if (row.kind === "empty") return null;

  if (row.kind === "user") {
    return (
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <Avatar size="sm" className="size-6 text-[10px] shrink-0">
          <AvatarFallback className="bg-surface-subtle font-medium text-ink-secondary">
            {row.initials || <UserIcon className="size-3 text-ink-muted" aria-hidden="true" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-medium text-ink truncate">{row.userName}</span>
        </div>
        {row.childCount !== undefined && row.childCount > 0 ? (
          <span className="ml-auto rounded-full bg-surface-subtle px-1.5 py-0.2 text-[10px] text-ink-muted shrink-0 tabular-nums">
            {row.childCount}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pl-4 min-w-0 pr-2">
      <FolderKanban className="size-3.5 text-ink-muted shrink-0" aria-hidden="true" />
      <span className="text-xs font-normal text-ink truncate" title={row.projectName}>
        {row.text}
      </span>
    </div>
  );
}

function RoleStatusCell(props: CellProps) {
  const row = asTask(props.row);
  if (row.kind === "empty") return null;

  if (row.kind === "user") {
    return (
      <div className="flex items-center">
        <RoleBadge role={row.roleName ?? ""} />
      </div>
    );
  }

  const style = getProjectStatusStyle(row.statusName);
  const StatusIcon = style.icon;

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-xs",
          style.className,
        )}
        aria-hidden="true"
      >
        <StatusIcon className="size-3" />
      </span>
      <span className="text-xs text-ink-secondary truncate">
        {row.statusName ?? "Aktif"}
      </span>
    </div>
  );
}

function MandaysCell(props: CellProps) {
  const row = asTask(props.row);
  if (row.kind === "empty") return null;

  if (row.kind === "user") {
    const md = row.totalMandays ?? 0;
    return (
      <div className="flex items-center justify-end pr-2">
        <span className="inline-flex items-center rounded-xs bg-surface-subtle px-1.5 py-0.5 text-xs font-normal text-ink-secondary tabular-nums">
          {md} MD
        </span>
      </div>
    );
  }

  if (row.allocatedMandays) {
    return (
      <div className="flex items-center justify-end pr-2">
        <span className="text-xs text-ink-secondary tabular-nums">
          {row.allocatedMandays} MD
        </span>
      </div>
    );
  }

  return <div className="text-right pr-2 text-ink-muted text-xs">-</div>;
}

/* ---------- Batang Gantt ---------- */

function ResourceTimelineBar({ data }: { data: ITask }) {
  const t = data as unknown as ResourceTimelineTask;

  if (t.kind === "user") {
    return (
      <div
        data-slot="user-timeline-bar"
        className={cn(
          "wx-bar-inner flex h-full items-center justify-between rounded-xs px-2 text-xs",
          "border border-border/80 bg-surface-subtle/80 text-ink-secondary shadow-xs",
        )}
      >
        <span className="truncate font-medium">{t.userName}</span>
        <span className="tabular-nums font-normal text-[11px] text-ink-muted shrink-0 ml-1">
          {t.totalMandays ?? 0} MD
        </span>
      </div>
    );
  }

  const barClass = assignmentBarClass(t.statusName);

  return (
    <div
      data-slot="assignment-timeline-bar"
      className={cn(
        "wx-bar-inner flex h-full items-center justify-between rounded-xs border-l-3 px-2 text-xs cursor-pointer",
        barClass,
      )}
      title="Klik untuk melihat detail proyek"
    >
      <span className="truncate font-normal">{t.text}</span>
      {t.allocatedMandays ? (
        <span className="tabular-nums text-[10px] opacity-80 shrink-0 ml-1">
          {t.allocatedMandays} MD
        </span>
      ) : null}
    </div>
  );
}

/* ---------- Tooltip ---------- */

function ResourceTooltip({
  task,
  x,
  y,
}: {
  task: ResourceTimelineTask;
  x: number;
  y: number;
}) {
  if (task.kind === "user") {
    return (
      <GanttTooltip x={x} y={y} data-slot="resource-user-tooltip">
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
            <span className="font-medium text-xs text-ink">{task.userName}</span>
            <RoleBadge role={task.roleName ?? ""} />
          </div>
          <div className="flex flex-col gap-1 text-[11px] text-ink-muted">
            <div className="flex items-center justify-between">
              <span>Mandays bulan ini:</span>
              <span className="font-medium text-ink tabular-nums">{task.totalMandays ?? 0} MD</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Proyek Aktif:</span>
              <span className="text-ink font-medium">{task.childCount ?? 0} proyek</span>
            </div>
            {task.department ? (
              <div className="flex items-center justify-between">
                <span>Departemen:</span>
                <span className="text-ink">{task.department}</span>
              </div>
            ) : null}
          </div>
        </div>
      </GanttTooltip>
    );
  }

  return (
    <GanttTooltip x={x} y={y} data-slot="resource-assignment-tooltip">
      <div className="flex flex-col gap-1.5 min-w-[220px]">
        <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
          <span className="font-medium text-xs text-ink truncate">{task.projectName}</span>
          <span className="text-[10px] rounded-xs px-1 py-0.2 bg-surface-subtle text-ink-secondary">
            {task.statusName ?? "Aktif"}
          </span>
        </div>
        <div className="flex flex-col gap-1 text-[11px] text-ink-muted">
          {task.assetName ? (
            <div className="flex items-center justify-between">
              <span>Asset:</span>
              <span className="text-ink font-medium truncate max-w-[140px]">
                {task.assetName}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span>Periode:</span>
            <span className="text-ink">
              {fmtDate(task.start)} – {fmtDate(task.endInclusive)}
            </span>
          </div>
          {task.allocatedMandays ? (
            <div className="flex items-center justify-between">
              <span>Alokasi:</span>
              <span className="text-ink font-medium tabular-nums">
                {task.allocatedMandays} MD
              </span>
            </div>
          ) : null}
        </div>
        <p className="text-[10px] text-ink-muted pt-1 border-t border-border/60">
          Klik batang untuk membuka detail proyek
        </p>
      </div>
    </GanttTooltip>
  );
}
