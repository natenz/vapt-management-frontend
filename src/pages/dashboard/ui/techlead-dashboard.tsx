/**
 * Dashboard Tech Lead — ringkasan eksekutif dan pemantauan proyek:
 * 1. Ringkasan KPI: Proyek Berjalan dan Usulan Katalog (dengan CTA peninjauan).
 * 2. Pemantauan proyek berjalan dan progres tahapannya.
 * 3. Exposure vulnerability: temuan Open lintas proyek per severity dan proyek paling berisiko.
 */
import { ArrowRight, BookCheck, CalendarClock, FolderKanban } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import type { CatalogVulna } from "@/entities/catalog";
import type { Exposure } from "@/entities/finding";
import type { Project, ProjectDetail, ResourceLoad } from "@/entities/project";
import type { User } from "@/entities/user";
import { Alert } from "@/shared/ui/alert";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { Button } from "@/shared/ui/button";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { exposureRiskRows, exposureTotals } from "../model/exposure-metrics";
import { completedProjects, runningProjects } from "../model/techlead-metrics";
import { RiskiestProjectsCard, SeverityCard } from "./superadmin/finding-cards";
import { CompletedProjectsCard } from "./techlead/completed-projects-card";
import { RunningProjectsCard } from "./techlead/running-projects-card";

export interface TechLeadDashboardProps {
  projects: readonly Project[];
  users?: readonly User[];
  catalogQueue: readonly CatalogVulna[];
  loadMap?: Readonly<Record<number, ResourceLoad>>;
  isLoading: boolean;
  /** Detail proyek (penugasan mandays) untuk tabel penugasan mingguan. */
  details?: readonly ProjectDetail[];
  detailsLoading?: boolean;
  detailsError?: unknown;
  /** Jumlah kerentanan baku di katalog; null bila belum termuat. */
  approvedCount?: number | null;
  /** GET /dashboard/exposure. */
  exposure?: Exposure | null;
  exposureLoading?: boolean;
  exposureError?: unknown;
  /** Jumlah cuti yang menunggu persetujuan; null bila belum termuat. */
  pendingLeaveCount?: number | null;
}

export function TechLeadDashboard({
  projects,
  catalogQueue,
  isLoading,
  exposure,
  exposureLoading = false,
  exposureError,
  pendingLeaveCount = null,
}: TechLeadDashboardProps) {
  const running = useMemo(() => runningProjects(projects), [projects]);
  const completed = useMemo(() => completedProjects(projects), [projects]);
  const totals = useMemo(() => exposureTotals(exposure), [exposure]);
  const risky = useMemo(() => exposureRiskRows(exposure, projects), [exposure, projects]);

  return (
    <div className="flex flex-col gap-5" data-slot="techlead-dashboard">
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Ringkasan Operasional Tech Lead"
      >
        <SummaryTile
          label="Proyek Berjalan"
          value={isLoading ? null : running.length}
          unit="Proyek"
          icon={<FolderKanban />}
          fill="brand"
          loading={isLoading}
        />
        <SummaryTile
          label="Usulan Catalog"
          value={isLoading ? null : catalogQueue.length}
          unit="Usulan"
          icon={<BookCheck />}
          loading={isLoading}
          action={
            <Button
              asChild
              variant="outline"
              className="h-7 gap-1 border-ink-inverse/30 bg-transparent px-2.5 text-caption font-medium text-ink-inverse hover:border-ink-inverse hover:bg-ink-inverse/15 hover:text-ink-inverse"
            >
              <Link to="/catalog">
                <span>Tinjau</span>
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        <SummaryTile
          label="Cuti Menunggu"
          value={pendingLeaveCount}
          unit="Pengajuan"
          icon={<CalendarClock />}
          fill="info"
          loading={pendingLeaveCount === null}
          action={
            <Button
              asChild
              variant="outline"
              className="h-7 gap-1 border-ink-inverse/30 bg-transparent px-2.5 text-caption font-medium text-ink-inverse hover:border-ink-inverse hover:bg-ink-inverse/15 hover:text-ink-inverse"
            >
              <Link to="/calendar?tab=cuti&status=pending" aria-label="Tinjau cuti">
                <span>Tinjau</span>
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
      </section>

      <BentoGrid aria-label="Bento dashboard Tech Lead">
        {/* Pemantauan */}
        <RunningProjectsCard rows={running} isLoading={isLoading} colSpan={12} />

        {/* Exposure vulnerability lintas proyek */}
        {exposureError ? null : (
          <>
            <SeverityCard totals={totals} isLoading={exposureLoading} failed={0} colSpan={5} />
            <RiskiestProjectsCard rows={risky} isLoading={exposureLoading} failed={0} />
          </>
        )}

        <CompletedProjectsCard projects={completed} isLoading={isLoading} />
      </BentoGrid>

      {exposureError ? (
        <Alert tone="error" title="Exposure vulnerability belum bisa dimuat">
          {exposureError instanceof Error ? exposureError.message : "Coba muat ulang halaman."}
        </Alert>
      ) : null}
    </div>
  );
}
