import type { ProjectReport } from "@/entities/finding";

export type AssetReport = {
  asset: ProjectReport["assets"][number];
  findings: ProjectReport["findings"];
  bySeverity: Record<string, number>;
};

/** Kelompokkan temuan per aset (dari GET /projects/:id/report, finding.asset_id). Aset tanpa temuan tetap muncul. */
export function groupByAsset(r: Pick<ProjectReport, "assets" | "findings">, severities: readonly string[]): AssetReport[] {
  return r.assets.map((asset) => {
    const findings = r.findings.filter((f) => f.asset_id === asset.assets_id);
    const bySeverity = Object.fromEntries(severities.map((s) => [s, findings.filter((f) => f.severity === s).length]));
    return { asset, findings, bySeverity };
  });
}
