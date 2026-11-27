import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { getCalendar } from "@/entities/calendar";
import { ScheduleRangeControls, type ScheduleRangeValue } from "@/features/schedule-range";
import { Alert } from "@/shared/ui/alert";
import { currentMonthSchedule, TeamCalendar, toIsoDate } from "@/widgets/team-calendar";

const select = "h-9 rounded-sm border border-border-control bg-surface px-3 text-body-sm text-ink focus-ring";

export function CalendarTab({ isPentester }: { isPentester: boolean }) {
  const [sp, setSp] = useSearchParams();
  const [schedule, setSchedule] = useState<ScheduleRangeValue>(() => currentMonthSchedule());
  const personId = Number(sp.get("orang")) || 0;
  const projectId = Number(sp.get("proyek")) || 0;
  const set = (key: string, value: string) =>
    setSp(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  const from = toIsoDate(schedule.range.start);
  const to = toIsoDate(schedule.range.end);
  const calendar = useQuery({
    queryKey: ["calendar", from, to],
    queryFn: () => getCalendar({ from, to }),
  });

  const projects = useMemo(() => {
    const seen = new Map<number, string>();
    for (const p of calendar.data?.people ?? []) {
      for (const b of p.bookings) if (!b.masked && b.project_id) seen.set(b.project_id, b.project_name);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [calendar.data]);
  const filters = useMemo(() => ({ personId, projectId }), [personId, projectId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {!isPentester ? (
            <select aria-label="Filter pentester" className={select} value={personId || ""} onChange={(e) => set("orang", e.target.value)}>
              <option value="">Semua pentester</option>
              {(calendar.data?.people ?? []).map((p) => (
                <option key={p.sys_user_id} value={p.sys_user_id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null}
          <select aria-label="Filter proyek" className={select} value={projectId || ""} onChange={(e) => set("proyek", e.target.value)}>
            <option value="">Semua proyek</option>
            {projects.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <ScheduleRangeControls value={schedule} onChange={setSchedule} className="lg:justify-end" />
      </div>

      {calendar.error ? (
        <Alert tone="error" title="Kalender belum bisa dimuat">
          {calendar.error.message}
        </Alert>
      ) : (
        <TeamCalendar
          data={calendar.data}
          isLoading={calendar.isLoading}
          schedule={schedule}
          onScheduleChange={setSchedule}
          filters={filters}
        />
      )}
    </div>
  );
}
