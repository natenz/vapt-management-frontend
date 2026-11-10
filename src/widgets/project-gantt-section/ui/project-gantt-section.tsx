import type { ProjectDetail } from "@/entities/project";
import { Gantt, type GanttItem } from "@/shared/ui/gantt";
import { mandaysState } from "../model/gantt-state";

export function ProjectGanttSection({ project }: { project: ProjectDetail }) {
  const current = project.status?.status_name ?? "";
  const items: GanttItem[] = project.mandays
    .filter((m) => m.start_date && m.end_date)
    .map((m) => ({
      id: String(m.mandays_id),
      label: `${m.asset?.asset_name ?? `Aset ${m.asset_id}`} · ${m.pentester?.profile?.full_name ?? m.pentester?.username ?? "-"}`,
      startsAt: m.start_date as string,
      endsAt: m.end_date as string,
      state: mandaysState(m, current),
    }));

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="timeline" className="flex flex-col gap-3 rounded-md border border-border bg-surface p-6">
      <h2 id="timeline" className="text-title-md text-ink">Timeline pengujian</h2>
      <Gantt items={items} initialMonth={items[0] ? new Date(items[0].startsAt) : undefined} />
    </section>
  );
}
