import { describe, expect, it } from "vitest";
import type { Exposure } from "@/entities/finding";
import type { Project } from "@/entities/project";
import { exposureRiskRows, exposureTotals } from "./exposure-metrics";

const exposure: Exposure = {
  total: 6,
  by_severity: { Critical: 1, High: 2, Medium: 3 },
  projects: [
    { project_id: 7, project_name: "VAPT HRIS", client_name: "PT SDP", critical: 1, high: 0, open: 2 },
    { project_id: 9, project_name: "Arsip", client_name: "PT Lama", critical: 0, high: 2, open: 4 },
  ],
};

const project = (id: number, name: string): Project => ({
  project_id: id,
  project_name: name,
  client_name: "Klien",
  total_mandays: 0,
  projected_mandays: 0,
  pm_id: 1,
  status: { status_process_id: 3, status_name: "Assessment" },
});

describe("exposureTotals", () => {
  it("memetakan jumlah per severity, mengisi severity yang kosong dengan nol", () => {
    const totals = exposureTotals(exposure);
    expect(totals.open).toBe(6);
    expect(totals.openBySeverity).toEqual({ Critical: 1, High: 2, Medium: 3, Low: 0, Informational: 0 });
  });

  it("menghasilkan nol semua saat data belum ada", () => {
    expect(exposureTotals(undefined).open).toBe(0);
    expect(exposureTotals(undefined).openBySeverity.Critical).toBe(0);
  });
});

describe("exposureRiskRows", () => {
  it("memakai data proyek dari daftar proyek bila ada, dan tetap tampil bila tidak ada", () => {
    const rows = exposureRiskRows(exposure, [project(7, "VAPT HRIS (daftar)")]);
    expect(rows.map((r) => [r.project.project_id, r.critical, r.high, r.open])).toEqual([
      [7, 1, 0, 2],
      [9, 0, 2, 4],
    ]);
    expect(rows[0]!.project.status?.status_name).toBe("Assessment");
    expect(rows[1]!.project.project_name).toBe("Arsip");
    expect(rows[1]!.project.client_name).toBe("PT Lama");
  });
});
