import { describe, expect, it } from "vitest";
import { buildStageSchedule, mandaysState } from "./gantt-state";

const today = new Date("2026-11-09");
const m = (status: string, start = "2026-11-02") => ({ status, start_date: start });

describe("mandaysState", () => {
  it("selesai tahap Pentest => done, walau mandays.status masih planned (kondisi nyata BE)", () => {
    for (const s of ["Reporting", "Remediation", "Retest", "Done"]) expect(mandaysState(m("planned"), s, today)).toBe("done");
  });
  it("Draft/Planning => todo", () => {
    expect(mandaysState(m("planned"), "Planning", today)).toBe("todo");
    expect(mandaysState(m("planned"), "Draft", today)).toBe("todo");
  });
  it("Pentest: sudah mulai => current, belum mulai => todo", () => {
    expect(mandaysState(m("planned", "2026-11-02"), "Pentest", today)).toBe("current");
    expect(mandaysState(m("planned", "2026-12-01"), "Pentest", today)).toBe("todo");
  });
  it("status baris tetap dihormati", () => {
    expect(mandaysState(m("done"), "Pentest", today)).toBe("done");
    expect(mandaysState(m("in_progress", "2026-12-01"), "Planning", today)).toBe("current");
  });
});

describe("buildStageSchedule", () => {
  it("membentuk 8 tahap standar dengan Owner Telkom dan klien serta status sesuai tahap proyek", () => {
    const items = buildStageSchedule({
      start_date: "2026-09-02",
      end_date: "2026-09-17",
      client_name: "Indopack",
      status: { status_process_id: 5, status_name: "Remediation" },
      mandays: [],
    });

    expect(items).toHaveLength(8);
    expect(items.map((i) => i.label)).toEqual([
      "Scoping",
      "Assessment",
      "Analysis",
      "Initial Report",
      "Remediasi",
      "Retesting",
      "Final Report Drafting",
      "Final Presentation",
    ]);
    expect(items[0]).toMatchObject({ owner: "Telkom", startsAt: "2026-09-02", endsAt: "2026-09-02", state: "done" });
    expect(items[4]).toMatchObject({ owner: "Indopack", startsAt: "2026-09-07", endsAt: "2026-09-11", state: "current" });
    expect(items[7]).toMatchObject({ owner: "Telkom", startsAt: "2026-09-17", endsAt: "2026-09-17", state: "todo" });
  });

  it("memakai rentang nyata trx_mandays untuk tahap Assessment bila tersedia", () => {
    const items = buildStageSchedule({
      start_date: "2026-10-01",
      end_date: "2026-10-31",
      client_name: "PT Bank",
      status: { status_process_id: 3, status_name: "Pentest" },
      mandays: [
        { mandays_id: 1, asset_id: 1, pentester_id: 4, allocated_mandays: 5, start_date: "2026-10-03", end_date: "2026-10-08" },
        { mandays_id: 2, asset_id: 2, pentester_id: 5, allocated_mandays: 4, start_date: "2026-10-05", end_date: "2026-10-12" },
      ],
    });
    const assessment = items.find((i) => i.id === "assessment")!;
    expect(assessment).toMatchObject({ startsAt: "2026-10-03", endsAt: "2026-10-12", state: "current", source: "mandays" });
  });

  it("memprioritaskan data stages dari BE jika sudah tersedia", () => {
    const items = buildStageSchedule({
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      client_name: "Indopack",
      status: { status_process_id: 5, status_name: "Remediation" },
      mandays: [],
      stages: [
        { stage_id: 11, project_id: 1, sort_order: 1, stage_name: "Scoping", owner: "Telkom", start_date: "2026-09-02", end_date: "2026-09-02" },
        { stage_id: 12, project_id: 1, sort_order: 2, stage_name: "Assessment", owner: "Telkom", start_date: "2026-09-03", end_date: "2026-09-05" },
      ],
    });
    expect(items).toEqual([
      { id: "11", stageId: 11, label: "Scoping", owner: "Telkom", startsAt: "2026-09-02", endsAt: "2026-09-02", state: "done", source: "server" },
      { id: "12", stageId: 12, label: "Assessment", owner: "Telkom", startsAt: "2026-09-03", endsAt: "2026-09-05", state: "done", source: "server" },
    ]);
  });
});
