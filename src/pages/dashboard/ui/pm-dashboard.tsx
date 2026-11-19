/**
 * Dashboard Project Manager — bento box untuk memantau semua proyek PM dan
 * mengambil keputusan tepat waktu: proyek yang menunggu PM (Scoping,
 * Remediasi, Retesting), kesehatan jadwal, kesiapan Assessment, progres
 * remediasi klien, dan linimasa tahap berjalan.
 */
import { Bug, CalendarClock, FolderKanban, Rocket } from "lucide-react";
import { useMemo } from "react";
import type { Project } from "@/entities/project";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { SummaryTile } from "@/shared/ui/summary-tile";
import {
  assessmentReadiness,
  PM_NEXT_STEP,
  pmQueue,
  pmTimeline,
  remediationProgress,
  type PmItem,
} from "../model/pm-metrics";
import { runningProjects, todayIso } from "../model/techlead-metrics";
import { useProjectReportData } from "../model/use-report-data";
import { MyTimelineCard } from "./pentester/my-timeline-card";
import { WorkPriorityCard } from "./pentester/priority-card";
import { AssessmentReadinessCard, RemediationCard } from "./pm/pm-cards";
import { RunningProjectsCard } from "./techlead/running-projects-card";

const FINDING_COLUMN = {
  label: "Temuan",
  icon: <Bug />,
  render: (r: PmItem) =>
    r.findings ? (
      <span className="flex flex-col tabular-nums">
        <span>{r.findings.total} temuan</span>
        <span className="text-caption text-ink-muted">
          {r.findings.open} terbuka · {r.findings.remediated} diperbaiki
        </span>
      </span>
    ) : (
      "-"
    ),
};

interface PmDashboardProps {
  projects: readonly Project[];
  isLoading: boolean;
}

export function PmDashboard({ projects, isLoading }: PmDashboardProps) {
  const data = useProjectReportData(projects);
  const details = data.details.map;
  const reports = data.reports.map;
  const today = todayIso();

  const queue = useMemo(() => pmQueue(data.active, details, reports, today), [data.active, details, reports, today]);
  const running = useMemo(() => runningProjects(data.active, today), [data.active, today]);
  const readiness = useMemo(() => assessmentReadiness(data.active, details, today), [data.active, details, today]);
  const remediation = useMemo(() => remediationProgress(data.active, reports), [data.active, reports]);
  const timeline = useMemo(() => pmTimeline(data.active, details, 6, today), [data.active, details, today]);

  const detailsLoading = isLoading || data.details.isLoading;
  const reportsLoading = isLoading || data.reports.isLoading;
  const turn = queue.filter((r) => r.myTurn).length;
  const late = running.filter((r) => r.health === "late").length;
  const risk = running.filter((r) => r.health === "at-risk").length;
  const openFindings = queue.reduce((s, r) => s + (r.findings?.open ?? 0), 0);
  const readyRetest = remediation.filter((r) => r.hint).length;
  const readyCount = readiness.filter((k) => k.ready).length;

  return (
    <div className="flex flex-col gap-5" data-slot="pm-dashboard">
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Ringkasan Proyek Project Manager"
      >
        <SummaryTile
          label="Proyek Saya"
          value={isLoading ? null : data.active.length}
          unit="Proyek"
          icon={<FolderKanban />}
          fill="brand"
          loading={isLoading}
          note={{ value: turn, text: "menunggu keputusan Anda" }}
        />
        <SummaryTile
          label="Jadwal Bermasalah"
          value={isLoading ? null : late + risk}
          unit="Proyek"
          icon={<CalendarClock />}
          loading={isLoading}
          note={late + risk > 0 ? { value: late, text: `terlambat · ${risk} berisiko tertinggal` } : { text: "Semua proyek sesuai jadwal" }}
        />
        <SummaryTile
          label="Temuan Terbuka"
          value={reportsLoading ? null : openFindings}
          unit="Temuan"
          icon={<Bug />}
          loading={reportsLoading}
          note={readyRetest > 0 ? { value: readyRetest, text: "proyek siap keputusan Retesting" } : { text: "di seluruh proyek Anda" }}
        />
        <SummaryTile
          label="Persiapan Assessment"
          value={detailsLoading ? null : readiness.length}
          unit="Proyek"
          icon={<Rocket />}
          loading={detailsLoading}
          note={{ value: readyCount, text: "sudah memenuhi syarat Assessment" }}
        />
      </section>

      <BentoGrid aria-label="Bento dashboard Project Manager">
        <WorkPriorityCard
          title="Perlu Tindakan Anda"
          rows={queue}
          isLoading={detailsLoading}
          failed={data.details.failed}
          nextStep={PM_NEXT_STEP}
          detailColumn={FINDING_COLUMN}
        />

        <RunningProjectsCard rows={running} isLoading={isLoading} />
        <AssessmentReadinessCard rows={readiness} isLoading={detailsLoading} />

        <MyTimelineCard
          data={timeline}
          isLoading={detailsLoading}
          description="Tahap yang sedang berjalan di tiap proyek Anda, 6 minggu ke depan."
          emptyText="Belum ada tahap berjalan yang terjadwal di 6 minggu ke depan."
        />
        <RemediationCard rows={remediation} isLoading={reportsLoading} failed={data.reports.failed} />
      </BentoGrid>
    </div>
  );
}
