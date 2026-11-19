import { describe, expect, it } from "vitest";
import type { Project } from "@/entities/project";
import {
  applyReportFilters,
  getReportStatusOptions,
  hasAnyFilter,
  parsePageSize,
  parseReportFilters,
  writePageSize,
  writeReportFilters,
} from "./report-filters";

const mockProjects = [
  {
    project_id: 1,
    project_name: "VAPT Banking",
    client_name: "Bank A",
    status: { status_process_id: 6, status_name: "Initial Report" },
  },
  {
    project_id: 2,
    project_name: "VAPT Commerce",
    client_name: "Toko B",
    status: { status_process_id: 10, status_name: "Final Presentation" },
  },
  {
    project_id: 3,
    project_name: "VAPT Portal",
    client_name: "Telkom",
    status: { status_process_id: 11, status_name: "Done" },
  },
] as unknown as Project[];

describe("report-filters", () => {
  it("menyaring report berdasarkan nama proyek atau klien", () => {
    const resName = applyReportFilters(mockProjects, { search: "commerce", statuses: [] });
    expect(resName).toHaveLength(1);
    expect(resName[0]?.project_name).toBe("VAPT Commerce");

    const resClient = applyReportFilters(mockProjects, { search: "telkom", statuses: [] });
    expect(resClient).toHaveLength(1);
    expect(resClient[0]?.project_name).toBe("VAPT Portal");
  });

  it("menyaring report berdasarkan status", () => {
    const resStatus = applyReportFilters(mockProjects, { search: "", statuses: ["Done"] });
    expect(resStatus).toHaveLength(1);
    expect(resStatus[0]?.project_name).toBe("VAPT Portal");
  });

  it("menghasilkan opsi status faset", () => {
    const opts = getReportStatusOptions(mockProjects);
    expect(opts.find((o) => o.value === "Initial Report")?.count).toBe(1);
    expect(opts.find((o) => o.value === "Done")?.count).toBe(1);
  });

  it("melakukan sinkronisasi URLSearchParams dan pageSize", () => {
    const params = new URLSearchParams("q=banking&status=Initial Report&per=50");
    const parsed = parseReportFilters(params);
    expect(parsed.search).toBe("banking");
    expect(parsed.statuses).toEqual(["Initial Report"]);
    expect(parsePageSize(params)).toBe(50);

    const written = writeReportFilters(parsed);
    expect(written.get("q")).toBe("banking");
    expect(written.get("status")).toBe("Initial Report");

    const writtenPage = writePageSize(50, new URLSearchParams());
    expect(writtenPage.get("per")).toBe("50");
  });

  it("mendeteksi apakah ada filter aktif", () => {
    expect(hasAnyFilter({ search: "", statuses: [] })).toBe(false);
    expect(hasAnyFilter({ search: "a", statuses: [] })).toBe(true);
    expect(hasAnyFilter({ search: "", statuses: ["Done"] })).toBe(true);
  });
});
