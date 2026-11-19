/**
 * Dashboard Technical Writer — bento box untuk memutuskan laporan mana yang
 * disusun dulu: daftar pembuatan laporan dari tenggat terdekat dan timeline
 * tahap laporan.
 */
import { Bug, FileText } from "lucide-react";
import { useMemo } from "react";
import type { Project } from "@/entities/project";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { todayIso } from "../model/techlead-metrics";
import { useProjectReportData } from "../model/use-report-data";
import {
  reportQueue,
  WRITER_NEXT_STEP,
  writerTimeline,
  type WriterItem,
} from "../model/writer-metrics";
import { MyTimelineCard } from "./pentester/my-timeline-card";
import { WorkPriorityCard } from "./pentester/priority-card";

const FINDING_COLUMN = {
  label: "Findings",
  icon: <Bug />,
  render: (r: WriterItem) =>
    r.loaded ? (
      <span className="flex flex-col tabular-nums">
        <span>{r.findings} findings</span>
        <span className="text-caption text-ink-muted">
          {r.severe} Critical/High
          {r.incomplete > 0 ? <span className="text-warning"> · {r.incomplete} belum lengkap</span> : null}
        </span>
      </span>
    ) : (
      "-"
    ),
};

/** Proyek di tahap writer membuka halaman laporan; selainnya detail proyek. */
const reportHref = (r: WriterItem) =>
  r.myTurn ? `/projects/${r.project.project_id}/report` : `/projects/${r.project.project_id}`;

interface WriterDashboardProps {
  projects: readonly Project[];
  isLoading: boolean;
}

export function WriterDashboard({ projects, isLoading }: WriterDashboardProps) {
  const data = useProjectReportData(projects);
  const details = data.details.map;
  const reports = data.reports.map;
  const today = todayIso();

  const queue = useMemo(() => reportQueue(data.active, details, reports, today), [data.active, details, reports, today]);
  const timeline = useMemo(() => writerTimeline(data.active, details, 6, today), [data.active, details, today]);

  const detailsLoading = isLoading || data.details.isLoading;
  const reportsLoading = isLoading || data.reports.isLoading;
  // Total temuan di seluruh proyek yang ditugaskan ke writer
  const totalFindings = queue.reduce((s, r) => s + r.findings, 0);

  return (
    <div className="flex flex-col gap-5" data-slot="writer-dashboard">
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        aria-label="Ringkasan Kerja Technical Writer"
      >
        <SummaryTile
          label="Proyek Ditugaskan"
          value={isLoading ? null : data.active.length}
          unit="Proyek"
          icon={<FileText />}
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

      <BentoGrid aria-label="Bento dashboard Technical Writer">
        <WorkPriorityCard
          title="Pembuatan Report"
          rows={queue}
          isLoading={detailsLoading}
          failed={data.details.failed}
          nextStep={WRITER_NEXT_STEP}
          detailColumn={FINDING_COLUMN}
          href={reportHref}
        />

        <MyTimelineCard
          data={timeline}
          isLoading={detailsLoading}
          colSpan={12}
          description="Stage Initial Report, Final Report, dan presentasi selama 6 minggu ke depan."
          emptyText="Belum ada stage report yang terjadwal di 6 minggu ke depan."
        />
      </BentoGrid>
    </div>
  );
}
