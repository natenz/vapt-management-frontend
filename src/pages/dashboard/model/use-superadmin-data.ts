/**
 * Sumber data dashboard Superadmin. Tiap sumber punya status muat/galat sendiri
 * agar kartu bento tampil atau gagal secara mandiri.
 *
 * ponytail: BE belum punya endpoint agregat, jadi temuan diambil 1 report per
 * proyek (hanya Assessment ke atas) dan aktivitas 1 status-log per proyek
 * terbaru. Report memakai key ["report", id] yang sama dengan ReportPage
 * sehingga cache terpakai bersama. Kalau proyek bertambah banyak, minta BE
 * menyediakan GET /dashboard/summary.
 */
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listCatalog } from "@/entities/catalog";
import { getReport, type ProjectReport } from "@/entities/finding";
import {
  currentMonth,
  getResourceLoad,
  listStatuses,
  listStatusLogs,
  type Project,
  type StatusLog,
} from "@/entities/project";
import { listUsers } from "@/entities/user";
import { hasFindingsStage, recentlyUpdated } from "./superadmin-metrics";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useSuperAdminData(projects: readonly Project[], enabled = true) {
  const statuses = useQuery({ queryKey: ["statuses"], queryFn: listStatuses, enabled });
  const users = useQuery({ queryKey: ["users", "all"], queryFn: () => listUsers(), enabled });
  const month = currentMonth();
  const load = useQuery({
    queryKey: ["workload", "detail", month],
    queryFn: () => getResourceLoad(month),
    enabled,
  });
  const approved = useQuery({
    queryKey: ["catalog", "approved"],
    queryFn: () => listCatalog({ status: "approved" }),
    enabled,
  });
  const pending = useQuery({
    queryKey: ["catalog", "pending"],
    queryFn: () => listCatalog({ status: "pending" }),
    enabled,
  });
  const rejected = useQuery({
    queryKey: ["catalog", "rejected"],
    queryFn: () => listCatalog({ status: "rejected" }),
    enabled,
  });

  const findingProjects = useMemo(() => projects.filter(hasFindingsStage), [projects]);
  const reports = useQueries({
    queries: findingProjects.map((p) => ({
      queryKey: ["report", p.project_id],
      queryFn: () => getReport(p.project_id),
      staleTime: FIVE_MINUTES,
      enabled,
    })),
    combine: (results) => ({
      data: results.flatMap((r) => (r.data ? [r.data] : [])) as ProjectReport[],
      isLoading: results.some((r) => r.isLoading),
      failed: results.filter((r) => r.isError).length,
    }),
  });

  const activityProjects = useMemo(() => recentlyUpdated(projects, 8), [projects]);
  const logs = useQueries({
    queries: activityProjects.map((p) => ({
      queryKey: ["status-logs", p.project_id],
      queryFn: () => listStatusLogs(p.project_id),
      staleTime: FIVE_MINUTES,
      enabled,
    })),
    combine: (results) => ({
      results,
      isLoading: results.some((r) => r.isLoading),
      failed: results.filter((r) => r.isError).length,
    }),
  });
  const logsByProject = useMemo(() => {
    const map = new Map<number, StatusLog[]>();
    activityProjects.forEach((p, i) => {
      const data = logs.results[i]?.data;
      if (data) map.set(p.project_id, data);
    });
    return map;
  }, [activityProjects, logs.results]);

  return {
    statuses,
    users,
    load,
    catalog: {
      approved: approved.data ?? [],
      pending: pending.data ?? [],
      rejected: rejected.data ?? [],
      isLoading: approved.isLoading || pending.isLoading || rejected.isLoading,
      error: approved.error ?? pending.error ?? rejected.error,
    },
    reports: { ...reports, requested: findingProjects.length },
    activity: { logsByProject, isLoading: logs.isLoading, failed: logs.failed },
  };
}

export type SuperAdminData = ReturnType<typeof useSuperAdminData>;
