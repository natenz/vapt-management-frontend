/**
 * Menguji preset chart terhadap aturan § 10 yang paling mudah dilanggar
 * kalau seseorang memakai Recharts langsung.
 *
 * Preset-lah yang menegakkan aturan ini, jadi di sinilah tempat menjaganya.
 */
import { describe, expect, it } from "vitest";
import {
  VIZ_MAX_SERIES,
  areaFillOpacity,
  axisProps,
  barGap,
  barRadius,
  gridProps,
  lineProps,
  seriesColor,
} from "./chart";

describe("preset chart", () => {
  it('tidak pernah menggambar gridline vertikal', () => {
    // § 10: "no vertical gridlines".
    expect(gridProps.vertical).toBe(false);
  });

  it("tidak menggambar garis sumbu selain baseline", () => {
    // § 10: "no axis lines except the baseline".
    expect(axisProps.axisLine).toBe(false);
    expect(axisProps.tickLine).toBe(false);
  });

  it("memakai garis 2px dengan round cap dan tanpa dot", () => {
    // § 10: "Lines 2px with 4px round end caps".
    expect(lineProps.strokeWidth).toBe(2);
    expect(lineProps.strokeLinecap).toBe("round");
    expect(lineProps.dot).toBe(false);
  });

  it("menjaga opacity area di rentang 12-16%", () => {
    expect(areaFillOpacity).toBeGreaterThanOrEqual(0.12);
    expect(areaFillOpacity).toBeLessThanOrEqual(0.16);
  });

  it("memberi bar radius-xs di atas saja dan gap minimal 8px", () => {
    // § 10: "bars with radius-xs at the top and 8px minimum gaps".
    expect(barRadius).toEqual([4, 4, 0, 0]);
    expect(barGap).toBeGreaterThanOrEqual(8);
  });

  it("menyorot tepat satu seri; sisanya warna konteks", () => {
    // § 10: "One series or bar in viz-1; everything else viz-3."
    expect(seriesColor(0)).toContain("viz-1");
    expect(seriesColor(1)).toContain("viz-3");
    expect(seriesColor(2)).toContain("viz-3");

    // Sorot bisa dipindah ke seri lain, tapi tetap hanya satu.
    expect(seriesColor(2, 2)).toContain("viz-1");
    expect(seriesColor(0, 2)).toContain("viz-3");
  });

  it("mengambil warna lewat var() sehingga ikut berganti tema", () => {
    // Nilai hex akan membeku di satu tema; var() tidak.
    expect(seriesColor(0)).toMatch(/^var\(--color-/);
  });

  it('membatasi palet ke empat seri lebih, sesuai "split the chart instead"', () => {
    expect(VIZ_MAX_SERIES).toBeLessThanOrEqual(5);
  });
});
