/**
 * Dashboard Project Manager — ringkas: tiga angka utama, lalu daftar proyek
 * berjalan beserta progresnya selebar penuh.
 */
import { Bug, FolderKanban } from "lucide-react";
import { useMemo } from "react";
import type { Project } from "@/entities/project";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { useFillHeight } from "@/shared/lib/use-fill-height";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { pmQueue } from "../model/pm-metrics";
import { runningProjects, todayIso } from "../model/techlead-metrics";
import { useProjectReportData } from "../model/use-report-data";
import { RunningProjectsCard } from "./techlead/running-projects-card";

interface PmDashboardProps {
  projects: readonly Project[];
  isLoading: boolean;
}

export function PmDashboard({ projects, isLoading }: PmDashboardProps) {
  const data = useProjectReportData(projects);
  const details = data.details.map;
  const reports = data.reports.map;
  const today = todayIso();
  // Kartu proyek berjalan mengisi sisa satu layar di bawah KPI (desktop); bawahnya = padding main (py-8).
  const fill = useFillHeight<HTMLDivElement>({ bottomGap: 32 });

  const queue = useMemo(() => pmQueue(data.active, details, reports, today), [data.active, details, reports, today]);
  const running = useMemo(() => runningProjects(data.active, today), [data.active, today]);

  const reportsLoading = isLoading || data.reports.isLoading;
  const totalFindings = queue.reduce((s, r) => s + (r.findings?.total ?? 0), 0);

  return (
    <div className="flex flex-col gap-5" data-slot="pm-dashboard">
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        aria-label="Ringkasan Proyek Project Manager"
      >
        <SummaryTile
          label="Projects"
          value={isLoading ? null : data.active.length}
          unit="Proyek"
          icon={<FolderKanban />}
          fill="brand"
          loading={isLoading}
        />
        <SummaryTile
          label="Total Findings"
          value={reportsLoading ? null : totalFindings}
          unit="Findings"
          icon={<Bug />}
          loading={reportsLoading}
        />
      </section>

      <BentoGrid
        ref={fill.ref}
        style={fill.height ? { height: fill.height } : undefined}
        className="lg:grid-rows-[minmax(0,1fr)]"
        aria-label="Bento dashboard Project Manager"
      >
        <RunningProjectsCard rows={running} isLoading={isLoading} colSpan={12} scrollable />
      </BentoGrid>
    </div>
  );
}
