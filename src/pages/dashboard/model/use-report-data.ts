/**
 * Sumber data dashboard Technical Writer & Project Manager: detail proyek
 * (jadwal tahap, aset, tim) dan report per proyek (temuan + evidence). Key ["project", id] dan ["report", id]
 * sama dengan halaman detail proyek dan ReportPage sehingga cache terpakai bersama.
 */
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { getReport, type ProjectReport } from "@/entities/finding";
import { getProject, type Project, type ProjectDetail } from "@/entities/project";
import { hasFindings } from "./role-work";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useProjectReportData(projects: readonly Project[]) {
  const active = useMemo(() => projects.filter((p) => p.status?.status_name !== "Done"), [projects]);
  const withFindings = useMemo(() => active.filter(hasFindings), [active]);

  const details = useQueries({
    queries: active.map((p) => ({
      queryKey: ["project", p.project_id],
      queryFn: () => getProject(p.project_id),
      staleTime: FIVE_MINUTES,
    })),
    combine: (results) => ({
      list: results.flatMap((r) => (r.data ? [r.data] : [])),
      isLoading: results.some((r) => r.isLoading),
      failed: results.filter((r) => r.isError).length,
    }),
  });

  const reports = useQueries({
    queries: withFindings.map((p) => ({
      queryKey: ["report", p.project_id],
      queryFn: () => getReport(p.project_id),
      staleTime: FIVE_MINUTES,
    })),
    combine: (results) => ({
      list: results.flatMap((r) => (r.data ? [r.data] : [])),
      isLoading: results.some((r) => r.isLoading),
      failed: results.filter((r) => r.isError).length,
    }),
  });

  const detailMap = useMemo(
    () => new Map<number, ProjectDetail>(details.list.map((d) => [d.project_id, d])),
    [details.list],
  );
  const reportMap = useMemo(
    () => new Map<number, ProjectReport>(reports.list.map((r) => [r.project.project_id, r])),
    [reports.list],
  );

  return {
    active,
    details: { map: detailMap, isLoading: details.isLoading, failed: details.failed },
    reports: { map: reportMap, isLoading: reports.isLoading, failed: reports.failed },
  };
}
