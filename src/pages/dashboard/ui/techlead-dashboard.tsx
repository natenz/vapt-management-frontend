/**
 * Dashboard Tech Lead — bento box untuk dua pekerjaan utama:
 * 1. Memantau proyek dan penugasan tim: progres proyek berjalan, MD terjadwal
 *    pentester per minggu dan per bulan. Belum ada aturan resmi batas beban per
 *    orang, jadi dashboard tidak menilai "tersedia/penuh"; Tech Lead yang memutuskan.
 * 2. Mengelola katalog kerentanan: meninjau dan meng-ACC usulan dari tim.
 * Angka dihitung di `model/techlead-metrics`.
 */
import { BookCheck, Clock, FolderKanban } from "lucide-react";
import { useMemo } from "react";
import type { CatalogVulna } from "@/entities/catalog";
import type { Project, ProjectDetail, ResourceLoad } from "@/entities/project";
import type { User } from "@/entities/user";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { SummaryTile } from "@/shared/ui/summary-tile";
import { teamMandays } from "../model/superadmin-metrics";
import { pentestersOf, runningProjects } from "../model/techlead-metrics";
import { PentesterMandaysCard } from "./superadmin/team-cards";
import { CatalogReviewCard } from "./techlead/catalog-review-card";
import { RunningProjectsCard } from "./techlead/running-projects-card";
import { WorkloadHeatmapCard } from "./techlead/workload-heatmap-card";

export interface TechLeadDashboardProps {
  projects: readonly Project[];
  users: readonly User[];
  catalogQueue: readonly CatalogVulna[];
  loadMap: Readonly<Record<number, ResourceLoad>>;
  isLoading: boolean;
  /** Detail proyek (penugasan mandays) untuk tabel penugasan mingguan. */
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
  const cap = useMemo(() => teamMandays(users, loadMap), [users, loadMap]);
  const late = running.filter((r) => r.health === "late").length;
  const atRisk = running.filter((r) => r.health === "at-risk").length;

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
          note={
            late + atRisk > 0
              ? { value: `${late} terlambat`, text: `· ${atRisk} berisiko tertinggal` }
              : { text: `${projects.length} total proyek, semua sesuai jadwal` }
          }
        />
        <SummaryTile
          label="Mandays Tim"
          value={isLoading ? null : Math.round(cap.used)}
          unit="MD"
          icon={<Clock />}
          loading={isLoading}
          note={{ text: "ditugaskan ke pentester bulan ini" }}
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
        {/* Penugasan tim */}
        <WorkloadHeatmapCard
          pentesters={pentesters}
          details={details}
          isLoading={isLoading || detailsLoading}
          error={detailsError}
        />
        <PentesterMandaysCard data={cap} isLoading={isLoading} error={null} />

        {/* Pemantauan */}
        <RunningProjectsCard rows={running} isLoading={isLoading} colSpan={12} />

        {/* Katalog */}
        <CatalogReviewCard queue={catalogQueue} approvedCount={approvedCount} isLoading={isLoading} />
      </BentoGrid>
    </div>
  );
}
