/**
 * Dashboard Tech Lead — bento box untuk dua keputusan utama:
 * 1. Menjadwalkan proyek baru: kapan slot yang cocok dan siapa yang ditugaskan
 *    (proyek berjalan + progres, beban pentester, heatmap mingguan, perencana slot).
 * 2. Mengelola katalog kerentanan: meninjau dan meng-ACC usulan dari tim.
 * Angka dihitung di `model/techlead-metrics`.
 */
import { BookCheck, Clock, FolderKanban, UserCheck } from "lucide-react";
import { useMemo } from "react";
import type { CatalogVulna } from "@/entities/catalog";
import type { Project, ProjectDetail, ResourceLoad } from "@/entities/project";
import type { User } from "@/entities/user";
import { isOverLimit } from "@/shared/config/workload";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { capacity } from "../model/superadmin-metrics";
import { pentestersOf, runningProjects } from "../model/techlead-metrics";
import { CapacityCard } from "./superadmin/team-cards";
import { CatalogReviewCard } from "./techlead/catalog-review-card";
import { RunningProjectsCard } from "./techlead/running-projects-card";
import { SlotPlannerCard } from "./techlead/slot-planner-card";
import { WorkloadHeatmapCard } from "./techlead/workload-heatmap-card";

/** Di bawah ambang ini (MD bulan ini) pentester dianggap siap menerima proyek baru. */
const AVAILABLE_BELOW = 15;

export interface TechLeadDashboardProps {
  projects: readonly Project[];
  users: readonly User[];
  catalogQueue: readonly CatalogVulna[];
  loadMap: Readonly<Record<number, ResourceLoad>>;
  isLoading: boolean;
  /** Detail proyek (penugasan mandays) untuk heatmap & perencana slot. */
  details?: readonly ProjectDetail[];
  detailsLoading?: boolean;
  detailsError?: unknown;
  /** Jumlah kerentanan baku di katalog; null bila belum termuat. */
  approvedCount?: number | null;
}

export function TechLeadDashboard({
  projects,
  users,
  catalogQueue,
  loadMap,
  isLoading,
  details = [],
  detailsLoading = false,
  detailsError = null,
  approvedCount = null,
}: TechLeadDashboardProps) {
  const pentesters = useMemo(() => pentestersOf(users), [users]);
  const running = useMemo(() => runningProjects(projects), [projects]);
  const cap = useMemo(() => capacity(users, loadMap), [users, loadMap]);
  const available = cap.ranking.filter((r) => !isOverLimit(r.mandays) && r.mandays < AVAILABLE_BELOW);
  const late = running.filter((r) => r.health === "late").length;
  const atRisk = running.filter((r) => r.health === "at-risk").length;

  return (
    <div className="flex flex-col gap-5" data-slot="techlead-dashboard">
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Ringkasan Operasional Tech Lead"
      >
        <SummaryTile
          label="Proyek Berjalan"
          value={isLoading ? null : running.length}
          unit="Proyek"
          icon={<FolderKanban />}
          fill="brand"
          loading={isLoading}
          note={
            late + atRisk > 0
              ? { value: `${late} terlambat`, text: `· ${atRisk} berisiko tertinggal` }
              : { text: `${projects.length} total proyek, semua sesuai jadwal` }
          }
        />
        <SummaryTile
          label="Ketersediaan Pentester"
          value={isLoading ? null : available.length}
          unit="Siap Ditugaskan"
          icon={<UserCheck />}
          loading={isLoading}
          note={{ text: `beban < ${AVAILABLE_BELOW} MD bulan ini, dari ${cap.pentesters} pentester` }}
        />
        <SummaryTile
          label="Beban Mandays Tim"
          value={isLoading ? null : Math.round(cap.used)}
          unit="MD"
          icon={<Clock />}
          loading={isLoading}
          note={
            cap.overloaded.length > 0
              ? { value: `${cap.overloaded.length} personil`, text: "melebihi batas alokasi" }
              : { text: `dari kapasitas ${cap.limit} MD bulan ini` }
          }
        />
        <SummaryTile
          label="Antrean Usulan Katalog"
          value={isLoading ? null : catalogQueue.length}
          unit="Usulan"
          icon={<BookCheck />}
          loading={isLoading}
          note={{
            text: catalogQueue.length > 0 ? "menunggu peninjauan Anda" : "basis data kerentanan mutakhir",
          }}
        />
      </section>

      <BentoGrid aria-label="Bento dashboard Tech Lead">
        {/* Penjadwalan proyek baru */}
        <SlotPlannerCard
          pentesters={pentesters}
          details={details}
          isLoading={isLoading || detailsLoading}
          error={detailsError}
        />
        <WorkloadHeatmapCard
          pentesters={pentesters}
          details={details}
          isLoading={isLoading || detailsLoading}
          error={detailsError}
        />

        {/* Pemantauan */}
        <RunningProjectsCard rows={running} isLoading={isLoading} />
        <CapacityCard data={cap} isLoading={isLoading} error={null} />

        {/* Katalog */}
        <CatalogReviewCard queue={catalogQueue} approvedCount={approvedCount} isLoading={isLoading} />
      </BentoGrid>
    </div>
  );
}
