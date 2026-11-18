import { describe, expect, it } from "vitest";
import {
  buildScheduleTrend,
  countTrendBuckets,
  formatRangeLabel,
  getDefaultScheduleRange,
  isGranularityAllowed,
  resolveGranularity,
  shiftDateRange,
} from "./schedule-trend";
import type { Project } from "./types";

const makeProject = (id: number, status: string, start: string, end: string): Project => ({
  project_id: id,
  project_name: `Proyek ${id}`,
  client_name: "Klien",
  total_mandays: 1,
  projected_mandays: 1,
  pm_id: 1,
  start_date: start,
  end_date: end,
  status: { status_process_id: id, status_name: status },
});

const projects: Project[] = [
  makeProject(1, "Assessment", "2026-01-10", "2026-02-05"),
  makeProject(2, "Done", "2026-11-01", "2026-11-30"),
  makeProject(3, "Draft", "2026-03-01", "2026-03-31"),
  makeProject(4, "Planning", "2025-12-20", "2026-01-03"),
];

const year2026 = { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) };

describe("schedule-trend: rentang default dan label", () => {
  it("rentang default adalah seluruh tahun berjalan", () => {
    const range = getDefaultScheduleRange(new Date(2026, 10, 17));
    expect(formatRangeLabel(range)).toBe("1 Jan – 31 Des 2026");
  });

  it("label rentang lintas tahun dan satu hari", () => {
    expect(
      formatRangeLabel({ start: new Date(2025, 11, 1), end: new Date(2026, 0, 31) }),
    ).toBe("1 Des 2025 – 31 Jan 2026");
    expect(
      formatRangeLabel({ start: new Date(2026, 10, 17), end: new Date(2026, 10, 17) }),
    ).toBe("17 Nov 2026");
  });
});

describe("schedule-trend: snapshot per interval", () => {
  it("interval Bulan pada satu tahun menghasilkan 12 snapshot dengan hitungan overlap", () => {
    const { trend, totalScheduled } = buildScheduleTrend(projects, {
      granularity: "month",
      range: year2026,
    });

    expect(trend).toHaveLength(12);
    expect(trend[0]).toMatchObject({ label: "Jan", count: 2, startDate: "2026-01-01" });
    expect(trend[1]?.count).toBe(1); // Proyek 1 berlanjut ke Februari
    expect(trend[2]?.count).toBe(0); // Draft dikecualikan
    expect(trend[10]).toMatchObject({ dateStr: "November 2026", count: 1 });
    expect(totalScheduled).toBe(3);
  });

  it("snapshot dipotong pada tepi rentang (minggu mulai Senin)", () => {
    const { trend } = buildScheduleTrend(projects, {
      granularity: "week",
      range: { start: new Date(2026, 0, 1), end: new Date(2026, 0, 14) },
    });

    // 1 Jan 2026 jatuh pada Kamis: minggu pertama terpotong 1–4 Jan
    expect(trend.map((t) => [t.startDate, t.endDate])).toEqual([
      ["2026-01-01", "2026-01-04"],
      ["2026-01-05", "2026-01-11"],
      ["2026-01-12", "2026-01-14"],
    ]);
    expect(trend[0]?.count).toBe(1); // Proyek 4 berakhir 3 Jan
  });

  it("interval Hari menghasilkan satu snapshot per hari", () => {
    const { trend } = buildScheduleTrend(projects, {
      granularity: "day",
      range: { start: new Date(2026, 10, 1), end: new Date(2026, 10, 30) },
    });
    expect(trend).toHaveLength(30);
    expect(trend.every((t) => t.count === 1)).toBe(true);
  });

  it("interval Tahun pada rentang lintas tahun", () => {
    const { trend } = buildScheduleTrend(projects, {
      granularity: "year",
      range: { start: new Date(2025, 0, 1), end: new Date(2026, 11, 31) },
    });
    expect(trend.map((t) => [t.label, t.count])).toEqual([
      ["2025", 1],
      ["2026", 3],
    ]);
  });
});

describe("schedule-trend: batas interval dan pergeseran rentang", () => {
  it("menolak interval yang menghasilkan terlalu banyak snapshot", () => {
    const threeYears = { start: new Date(2024, 0, 1), end: new Date(2026, 11, 31) };
    expect(countTrendBuckets(threeYears, "day")).toBe(1096);
    expect(isGranularityAllowed(threeYears, "day")).toBe(false);
    expect(isGranularityAllowed(threeYears, "week")).toBe(true);
    expect(resolveGranularity(threeYears, "day")).toBe("week");
    expect(isGranularityAllowed(year2026, "day")).toBe(true);
  });

  it("menggeser rentang selaras bulan per bulan kalender", () => {
    const prev = shiftDateRange(year2026, -1);
    expect(formatRangeLabel(prev)).toBe("1 Jan – 31 Des 2025");

    const feb = { start: new Date(2026, 1, 1), end: new Date(2026, 1, 28) };
    expect(formatRangeLabel(shiftDateRange(feb, 1))).toBe("1 Mar – 31 Mar 2026");
  });

  it("menggeser rentang bebas per jumlah hari", () => {
    const tenDays = { start: new Date(2026, 10, 5), end: new Date(2026, 10, 14) };
    expect(formatRangeLabel(shiftDateRange(tenDays, 1))).toBe("15 Nov – 24 Nov 2026");
  });
});
