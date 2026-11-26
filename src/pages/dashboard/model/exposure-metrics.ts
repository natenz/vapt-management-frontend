/**
 * Data exposure dari BE (GET /dashboard/exposure) dipetakan ke bentuk yang dipakai kartu temuan
 * Superadmin, supaya dashboard Tech Lead memakai kartu yang sama tanpa menghitung ulang di FE.
 */
import type { Exposure } from "@/entities/finding";
import type { Project } from "@/entities/project";
import { SEVERITIES } from "@/shared/api/schemas";
import type { FindingTotals, RiskRow, SeverityName } from "./superadmin-metrics";

export function exposureTotals(exposure: Exposure | null | undefined): FindingTotals {
  const openBySeverity = Object.fromEntries(
    SEVERITIES.map((s) => [s, exposure?.by_severity[s] ?? 0]),
  ) as Record<SeverityName, number>;
  const open = exposure?.total ?? 0;
  return { total: open, open, bySeverity: { ...openBySeverity }, openBySeverity, byStatus: { open, closed: 0 } };
}

/** Baris "Proyek Paling Berisiko". Data proyek lengkap diambil dari daftar proyek bila ada. */
export function exposureRiskRows(exposure: Exposure | null | undefined, projects: readonly Project[]): RiskRow[] {
  const byId = new Map(projects.map((p) => [p.project_id, p]));
  return (exposure?.projects ?? []).map((r) => ({
    project: byId.get(r.project_id) ?? {
      project_id: r.project_id,
      project_name: r.project_name,
      client_name: r.client_name,
      total_mandays: 0,
      projected_mandays: 0,
      pm_id: 0,
    },
    critical: r.critical,
    high: r.high,
    open: r.open,
  }));
}
