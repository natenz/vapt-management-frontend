import { describe, expect, it } from "vitest";
import type { ProjectReport } from "@/entities/finding";
import { groupByAsset } from "./report-views";

const asset = (id: number) => ({ assets_id: id, asset_name: `A${id}` }) as ProjectReport["assets"][number];
const finding = (id: number, asset_id: number, severity: string) => ({ vulna_id: id, asset_id, severity }) as ProjectReport["findings"][number];

describe("groupByAsset", () => {
  it("mengelompokkan temuan per aset dan menghitung severity", () => {
    const r = groupByAsset({ assets: [asset(6), asset(7)], findings: [finding(1, 6, "High"), finding(2, 7, "High"), finding(3, 7, "Low")] }, ["High", "Low"]);
    expect(r.map((x) => x.findings.length)).toEqual([1, 2]);
    expect(r[1]!.bySeverity).toEqual({ High: 1, Low: 1 });
  });
  it("aset tanpa temuan tetap muncul (mis. proyek TEST: aset 'apalah' kosong)", () => {
    const r = groupByAsset({ assets: [asset(13), asset(14)], findings: [finding(1, 14, "High")] }, ["High"]);
    expect(r).toHaveLength(2);
    expect(r[0]!.findings).toEqual([]);
  });
  it("temuan dengan aset yang sudah tidak ada tidak hilang diam-diam dari hitungan total", () => {
    const all = [finding(1, 6, "High"), finding(2, 99, "High")];
    const r = groupByAsset({ assets: [asset(6)], findings: all }, ["High"]);
    expect(r.flatMap((x) => x.findings)).toHaveLength(1); // yang yatim sengaja tidak masuk per-aset; tab Proyek tetap menampilkan semua
  });
});
