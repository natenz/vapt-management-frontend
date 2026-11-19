/**
 * Dashboard Technical Writer — bento box untuk memutuskan laporan mana yang
 * disusun dulu: antrean laporan dari tenggat terdekat, linimasa tahap laporan,
 * kelengkapan temuan sebagai bahan QA, dan volume temuan per proyek.
 */
import { Bug, CalendarClock, ClipboardCheck, FileText } from "lucide-react";
import { useMemo } from "react";
import type { Project } from "@/entities/project";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { todayIso } from "../model/techlead-metrics";
import { useProjectReportData } from "../model/use-report-data";
import {
  findingVolume,
  qualityByProject,
  reportQueue,
  WRITER_NEXT_STEP,
  writerTimeline,
  type WriterItem,
} from "../model/writer-metrics";
import { MyTimelineCard } from "./pentester/my-timeline-card";
import { WorkPriorityCard } from "./pentester/priority-card";
import { QualityCard, VolumeCard } from "./writer/writer-cards";

const FINDING_COLUMN = {
  label: "Temuan",
  icon: <Bug />,
  render: (r: WriterItem) =>
    r.loaded ? (
      <span className="flex flex-col tabular-nums">
        <span>{r.findings} temuan</span>
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
  const quality = useMemo(() => qualityByProject(data.active, reports), [data.active, reports]);
  const volume = useMemo(() => findingVolume(data.active, reports), [data.active, reports]);

  const detailsLoading = isLoading || data.details.isLoading;
  const reportsLoading = isLoading || data.reports.isLoading;
  const turn = queue.filter((r) => r.myTurn);
  const nearest = turn.find((r) => r.days !== null);
  const toReport = turn.reduce((s, r) => s + r.findings, 0);
  const severe = turn.reduce((s, r) => s + r.severe, 0);
  const incomplete = quality.reduce((s, r) => s + r.incomplete.length, 0);

  return (
    <div className="flex flex-col gap-5" data-slot="writer-dashboard">
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Ringkasan Kerja Technical Writer"
      >
        <SummaryTile
          label="Proyek Ditugaskan"
          value={isLoading ? null : data.active.length}
          unit="Proyek"
          icon={<FileText />}
          fill="brand"
          loading={isLoading}
          note={{ value: turn.length, text: `laporan di tahap Anda · ${data.active.length - turn.length} menyusul` }}
        />
        <SummaryTile
          label="Tenggat Terdekat"
          value={detailsLoading || !nearest ? null : Math.abs(nearest.days!)}
          unit={nearest && nearest.days! < 0 ? "Hari Terlambat" : "Hari Lagi"}
          icon={<CalendarClock />}
          loading={detailsLoading}
          note={{
            text: nearest
              ? `${nearest.dateLabel} · ${nearest.project.project_name}`
              : "Tidak ada laporan yang menunggu Anda",
          }}
        />
        <SummaryTile
          label="Temuan Dilaporkan"
          value={reportsLoading ? null : toReport}
          unit="Temuan"
          icon={<Bug />}
          loading={reportsLoading}
          note={severe > 0 ? { value: severe, text: "Critical/High di laporan Anda" } : { text: "di proyek tahap laporan" }}
        />
        <SummaryTile
          label="Temuan Belum Lengkap"
          value={reportsLoading ? null : incomplete}
          unit="Temuan"
          icon={<ClipboardCheck />}
          loading={reportsLoading}
          note={{ text: "tanpa bukti, CVSS, atau endpoint" }}
        />
      </section>

      <BentoGrid aria-label="Bento dashboard Technical Writer">
        <WorkPriorityCard
          title="Antrean Laporan"
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
          description="Tahap Initial Report, Final Report, dan presentasi selama 6 minggu ke depan."
          emptyText="Belum ada tahap laporan yang terjadwal di 6 minggu ke depan."
        />
        <VolumeCard rows={volume} isLoading={reportsLoading} failed={data.reports.failed} />

        <QualityCard rows={quality} isLoading={reportsLoading} failed={data.reports.failed} />
      </BentoGrid>
    </div>
  );
}
