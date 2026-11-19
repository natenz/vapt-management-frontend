import { describe, expect, it } from "vitest";
import {
  calculateProjectMetrics,
  doesProjectOverlapPeriod,
  formatPeriodLabel,
  isProjectEligibleForSchedule,
  normalizeDateStr,
} from "./metrics";
import type { Project } from "./types";

const makeProject = (
  id: number,
  name: string,
  status: string,
  start?: string | null,
  end?: string | null,
  statusId?: number,
): Project => ({
  project_id: id,
  project_name: name,
  client_name: "Klien Telkom",
  total_mandays: 10,
  projected_mandays: 10,
  pm_id: 1,
  start_date: start,
  end_date: end,
  status_id: statusId ?? 1,
  status: status ? { status_process_id: statusId ?? 1, status_name: status } : null,
});

describe("metrics: date normalization and overlap", () => {
  it("memformat label periode kontekstual sesuai spesifikasi Bahasa Indonesia", () => {
    const testDate = new Date(2026, 10, 17); // 17 November 2026 (Selasa)
    expect(formatPeriodLabel(testDate, "day")).toBe("17 November 2026");
    expect(formatPeriodLabel(testDate, "week")).toBe("16–22 November 2026");
    expect(formatPeriodLabel(testDate, "month")).toBe("November 2026");
    expect(formatPeriodLabel(testDate, "year")).toBe("Tahun 2026");
  });

  it("menormalisasi tanggal ISO ke YYYY-MM-DD", () => {
    expect(normalizeDateStr("2026-11-01")).toBe("2026-11-01");
    expect(normalizeDateStr("2026-11-01T00:00:00Z")).toBe("2026-11-01");
    expect(normalizeDateStr("2026-11-01T15:30:00+07:00")).toBe("2026-11-01");
    expect(normalizeDateStr(null)).toBeNull();
    expect(normalizeDateStr("")).toBeNull();
    expect(normalizeDateStr("invalid")).toBeNull();
  });

  it("menghitung kondisi overlap secara presisi", () => {
    // projectStart <= periodEnd AND projectEnd >= periodStart
    expect(doesProjectOverlapPeriod("2026-11-01", "2026-12-23", "2026-11-01", "2026-11-30")).toBe(true);
    expect(doesProjectOverlapPeriod("2026-10-01", "2026-10-31", "2026-11-01", "2026-11-30")).toBe(false);
    expect(doesProjectOverlapPeriod("2026-12-01", "2026-12-31", "2026-11-01", "2026-11-30")).toBe(false);
  });
});

describe("metrics: status and date validation", () => {
  it("mengecualikan proyek Draft dan menyertakan status Done serta alur aktif", () => {
    const draft = makeProject(1, "Draf", "Draft", "2026-11-01", "2026-11-30");
    const done = makeProject(2, "Selesai", "Done", "2026-11-01", "2026-11-30");
    const active = makeProject(3, "Pengujian", "Assessment", "2026-11-01", "2026-11-30");

    expect(isProjectEligibleForSchedule(draft).valid).toBe(false);
    expect(isProjectEligibleForSchedule(done).valid).toBe(true);
    expect(isProjectEligibleForSchedule(active).valid).toBe(true);
  });

  it("menyelesaikan status dari status_id menggunakan master status jika status objek kosong", () => {
    const p = makeProject(1, "Proyek Tanpa Status Objek", "", "2026-11-01", "2026-11-30", 1);
    p.status = null;

    const statusMap = new Map<number, string>([[1, "Draft"], [2, "Scoping"]]);
    expect(isProjectEligibleForSchedule(p, statusMap).valid).toBe(false);

    p.status_id = 2;
    expect(isProjectEligibleForSchedule(p, statusMap).valid).toBe(true);
  });

  it("mengecualikan proyek dengan tanggal hilang atau rentang tanggal tidak valid", () => {
    expect(isProjectEligibleForSchedule(makeProject(1, "Tanpa Start", "Scoping", null, "2026-11-30")).valid).toBe(false);
    expect(isProjectEligibleForSchedule(makeProject(2, "Tanpa End", "Scoping", "2026-11-01", null)).valid).toBe(false);
    expect(isProjectEligibleForSchedule(makeProject(3, "Terbalik", "Scoping", "2026-12-01", "2026-11-01")).valid).toBe(false);
  });
});

describe("metrics: core calculation logic with dynamic granularity and range", () => {
  const refDate = new Date("2026-11-17T12:00:00Z");

  const sampleProjects: Project[] = [
    makeProject(1, "Network", "Assessment", "2026-11-01", "2026-12-23"),
    makeProject(2, "Website", "Scoping", "2026-11-16", "2026-12-11"),
    makeProject(3, "HRIS", "Remediasi", "2026-11-02", "2026-11-27"),
    makeProject(4, "Gateway", "Done", "2026-10-01", "2026-10-31"), // Done disertakan
    makeProject(5, "Draft Project", "Draft", "2026-11-01", "2026-11-30"), // Draft dikecualikan
  ];

  it("default: granularitas per bulan dalam rentang currentYear (2026) dengan 12 bucket", () => {
    const result = calculateProjectMetrics(sampleProjects, { referenceDate: refDate });

    expect(result.range.granularity).toBe("month");
    expect(result.range.displayTitle).toBe("November 2026");
    expect(result.trend.length).toBe(12);

    const oct = result.trend.find((m) => m.label === "Okt");
    const nov = result.trend.find((m) => m.label === "Nov");
    const dec = result.trend.find((m) => m.label === "Des");
    const jan = result.trend.find((m) => m.label === "Jan");

    expect(oct?.count).toBe(1);
    expect(oct?.projectNames).toContain("Gateway");

    expect(nov?.count).toBe(3);
    expect(nov?.projectNames).toEqual(expect.arrayContaining(["Network", "Website", "HRIS"]));
    expect(nov?.projectNames).not.toContain("Draft Project");

    expect(dec?.count).toBe(2);
    expect(dec?.projectNames).toEqual(expect.arrayContaining(["Network", "Website"]));

    expect(jan?.count).toBe(0);

    // Total proyek unik di sepanjang bulan November 2026 adalah 3 (Network, Website, HRIS)
    expect(result.summary.totalScheduled).toBe(3);
  });

  it("dapat mengubah rentang tahun yang diamati (mis. Tahun 2025)", () => {
    const projects2025: Project[] = [
      makeProject(10, "Proyek 2025", "Done", "2025-05-01", "2025-06-30"),
    ];

    const result = calculateProjectMetrics(projects2025, {
      referenceDate: refDate,
      targetDate: new Date(2025, 4, 1),
      granularity: "month",
      year: 2025,
    });

    expect(result.range.displayTitle).toBe("Mei 2025");
    expect(result.trend.length).toBe(12);
    const may = result.trend.find((m) => m.label === "Mei");
    expect(may?.count).toBe(1);
    expect(result.summary.totalScheduled).toBe(1);
  });

  it("dapat memilih granularitas per hari dalam bulan tertentu", () => {
    const result = calculateProjectMetrics(sampleProjects, {
      referenceDate: refDate,
      targetDate: refDate,
      granularity: "day",
      year: 2026,
      month: 10, // November (0-indexed: 10)
    });

    expect(result.range.granularity).toBe("day");
    expect(result.range.displayTitle).toBe("17 November 2026");
    expect(result.trend.length).toBe(30); // 30 hari di November

    // Pada 17 November 2026, Network, Website, dan HRIS semuanya aktif
    const day17 = result.trend.find((d) => d.label === "17 Nov");
    expect(day17?.count).toBe(3);
  });

  it("dapat memilih granularitas per minggu dalam kuartal tertentu", () => {
    const result = calculateProjectMetrics(sampleProjects, {
      referenceDate: refDate,
      targetDate: refDate,
      granularity: "week",
      year: 2026,
      quarter: 4, // Q4 (Okt - Des)
    });

    expect(result.range.granularity).toBe("week");
    expect(result.range.displayTitle).toBe("16–22 November 2026");
    expect(result.trend.length).toBeGreaterThanOrEqual(12);
  });

  it("dapat memilih granularitas per tahun (rentang 5 tahun)", () => {
    const result = calculateProjectMetrics(sampleProjects, {
      referenceDate: refDate,
      targetDate: refDate,
      granularity: "year",
      startYear: 2022,
    });

    expect(result.range.granularity).toBe("year");
    expect(result.range.displayTitle).toBe("Tahun 2026");
    expect(result.trend.length).toBe(5);

    const y2026 = result.trend.find((y) => y.label === "2026");
    expect(y2026?.count).toBe(4);
  });
});
