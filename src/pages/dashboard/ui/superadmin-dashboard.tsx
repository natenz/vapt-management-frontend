/**
 * Dashboard Superadmin — bento box lintas modul: proyek & siklus, temuan &
 * risiko, tim & mandays, katalog & aktivitas. Halaman ini hanya menyusun
 * grid; angka dihitung di `model/superadmin-metrics`, data di `use-superadmin-data`.
 */
import { BookCheck, FolderKanban, ShieldAlert, Users } from "lucide-react";
import { useMemo } from "react";
import type { Project } from "@/entities/project";
import { BentoGrid } from "@/shared/ui/bento-grid";
import { SummaryTile } from "@/shared/ui/summary-tile";
import {
  catalogStats,
  findingTotals,
  monthlyTrend,
  projectKpis,
  recentActivity,
  riskiestProjects,
  roleComposition,
  stageFunnel,
  teamMandays,
  upcomingDeadlines,
} from "../model/superadmin-metrics";
import { useSuperAdminData } from "../model/use-superadmin-data";
import { ActivityCard, CatalogCard, ShortcutsCard } from "./superadmin/catalog-activity-cards";
import { FindingStatusCard, RiskiestProjectsCard, SeverityCard } from "./superadmin/finding-cards";
import { DeadlineCard, ProjectTrendCard, StageFunnelCard } from "./superadmin/project-cards";
import { PentesterMandaysCard, RoleCompositionCard } from "./superadmin/team-cards";

interface SuperAdminDashboardProps {
  projects: readonly Project[];
  isLoading: boolean;
}

export function SuperAdminDashboard({ projects, isLoading }: SuperAdminDashboardProps) {
  const data = useSuperAdminData(projects);
  const users = data.users.data ?? [];

  const kpis = useMemo(() => projectKpis(projects), [projects]);
  const trend = useMemo(() => monthlyTrend(projects, 12), [projects]);
  const funnel = useMemo(() => stageFunnel(projects, data.statuses.data), [projects, data.statuses.data]);
  const deadlines = useMemo(() => upcomingDeadlines(projects, 6), [projects]);
  const totals = useMemo(() => findingTotals(data.reports.data), [data.reports.data]);
  const risky = useMemo(() => riskiestProjects(data.reports.data, 5), [data.reports.data]);
  const roles = useMemo(() => roleComposition(users), [users]);
  const cap = useMemo(() => teamMandays(users, data.load.data ?? {}), [users, data.load.data]);
  const catalog = useMemo(
    () => catalogStats(data.catalog.approved, data.catalog.pending, data.catalog.rejected),
    [data.catalog.approved, data.catalog.pending, data.catalog.rejected],
  );
  const activity = useMemo(
    () => recentActivity(data.activity.logsByProject, projects, 10),
    [data.activity.logsByProject, projects],
  );

  const reportsLoading = isLoading || data.reports.isLoading;
  const usersLoading = data.users.isLoading;
  const pendingQueue = useMemo(
    () => [...data.catalog.pending].sort((a, b) => b.vulna_id - a.vulna_id),
    [data.catalog.pending],
  );

  return (
    <div className="flex flex-col gap-5" data-slot="superadmin-dashboard">
      {/* Baris KPI */}
      <section
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Ringkasan Eksekutif Sistem"
      >
        <SummaryTile
          label="Proyek Aktif"
          value={isLoading ? null : kpis.active}
          unit="Proyek"
          icon={<FolderKanban />}
          fill="brand"
          loading={isLoading}
        />
        <SummaryTile
          label="Findings Terbuka"
          value={reportsLoading ? null : totals.open}
          unit="Findings"
          icon={<ShieldAlert />}
          loading={reportsLoading}
        />
        <SummaryTile
          label="Personil Tim"
          value={usersLoading ? null : cap.team}
          unit="Orang"
          icon={<Users />}
          loading={usersLoading}
        />
        <SummaryTile
          label="Antrean Catalog"
          value={data.catalog.isLoading ? null : catalog.pending}
          unit="Pengajuan"
          icon={<BookCheck />}
          loading={data.catalog.isLoading}
        />
      </section>

      <BentoGrid aria-label="Bento dashboard Superadmin">
        {/* Proyek & temuan */}
        <ProjectTrendCard data={trend} isLoading={isLoading} />
        <SeverityCard totals={totals} isLoading={reportsLoading} failed={data.reports.failed} />

        <StageFunnelCard stages={funnel} isLoading={isLoading} />
        <RiskiestProjectsCard rows={risky} isLoading={reportsLoading} failed={data.reports.failed} />

        {/* Tim & penanganan */}
        <PentesterMandaysCard
          data={cap}
          isLoading={usersLoading || data.load.isLoading}
          error={data.load.error}
        />
        <RoleCompositionCard
          rows={roles}
          total={users.length}
          isLoading={usersLoading}
          error={data.users.error}
        />
        <FindingStatusCard totals={totals} isLoading={reportsLoading} failed={data.reports.failed} />

        {/* Tenggat & aktivitas */}
        <DeadlineCard rows={deadlines} isLoading={isLoading} />
        <ActivityCard
          items={activity}
          isLoading={isLoading || data.activity.isLoading}
          failed={data.activity.failed}
        />

        {/* Katalog & pintasan */}
        <CatalogCard
          stats={catalog}
          queue={pendingQueue}
          isLoading={data.catalog.isLoading}
          error={data.catalog.error}
        />
        <ShortcutsCard />
      </BentoGrid>
    </div>
  );
}
