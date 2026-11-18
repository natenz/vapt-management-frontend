import { describe, expect, it } from "vitest";
import type { Project } from "@/entities/project";
import {
  DEFAULT_TIMELINE_PAGE_SIZE,
  NO_PM_LABEL,
  TIMELINE_PAGE_SIZE_OPTIONS,
  buildTimelineTasks,
  filterTimelineProjects,
  getTimelinePmOptions,
  getTimelineStatusOptions,
  paginate,
  partitionScheduled,
  sortTimelineProjects,
  toScheduledProject,
} from "./timeline-tasks";

const make = (
  id: number,
  name: string,
  start: string | null,
  end: string | null,
  status = "Assessment",
  pm?: string,
): Project => ({
  project_id: id,
  project_name: name,
  client_name: `Klien ${id}`,
  total_mandays: 0,
  projected_mandays: 0,
  pm_id: 1,
  start_date: start,
  end_date: end,
  status: { status_process_id: 1, status_name: status },
  pm: pm
    ? ({ sys_user_id: 1, username: pm.toLowerCase(), profile: { full_name: pm } } as Project["pm"])
    : null,
});

const YEAR_2026 = { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) };

describe("toScheduledProject", () => {
  it("mem-parse tanggal tanpa pergeseran zona waktu", () => {
    const item = toScheduledProject(make(1, "A", "2026-03-01", "2026-03-31T00:00:00Z"));
    expect(item?.start).toEqual(new Date(2026, 2, 1));
    expect(item?.end).toEqual(new Date(2026, 2, 31));
  });

  it("mengecualikan tanggal kosong, tidak valid, atau terbalik", () => {
    expect(toScheduledProject(make(1, "A", null, "2026-03-31"))).toBeNull();
    expect(toScheduledProject(make(2, "B", "bukan-tanggal", "2026-03-31"))).toBeNull();
    expect(toScheduledProject(make(3, "C", "2026-04-01", "2026-03-01"))).toBeNull();
  });

  it("partitionScheduled menghitung proyek tanpa jadwal", () => {
    const { scheduled, unscheduledCount } = partitionScheduled([
      make(1, "A", "2026-01-01", "2026-01-10"),
      make(2, "B", null, null),
    ]);
    expect(scheduled).toHaveLength(1);
    expect(unscheduledCount).toBe(1);
  });
});

describe("filter & urutan", () => {
  const { scheduled } = partitionScheduled([
    make(1, "Gamma", "2026-02-01", "2026-02-20", "Done", "Sari"),
    make(2, "Alpha", "2026-01-05", "2026-03-01", "Planning", "Andi"),
    make(3, "Beta", "2025-06-01", "2025-07-01", "Planning", "Andi"),
    make(4, "Delta", "2025-12-15", "2026-01-10", "Scoping"),
  ]);

  it("hanya proyek yang beririsan dengan rentang data", () => {
    const names = filterTimelineProjects(
      scheduled,
      { search: "", statuses: [], pms: [] },
      YEAR_2026,
    ).map((i) => i.project.project_name);
    expect(names).toEqual(["Gamma", "Alpha", "Delta"]);
  });

  it("pencarian nama/klien, filter status dan PM", () => {
    const f = (patch: object) =>
      filterTimelineProjects(
        scheduled,
        { search: "", statuses: [], pms: [], ...patch },
        YEAR_2026,
      ).map((i) => i.project.project_id);
    expect(f({ search: "alp" })).toEqual([2]);
    expect(f({ search: "klien 1" })).toEqual([1]);
    expect(f({ statuses: ["Planning"] })).toEqual([2]);
    expect(f({ pms: [NO_PM_LABEL] })).toEqual([4]);
  });

  it("urut berdasarkan tanggal mulai, selesai, atau nama", () => {
    const ids = (sort: "start" | "end" | "name") =>
      sortTimelineProjects(scheduled, sort).map((i) => i.project.project_id);
    expect(ids("start")).toEqual([3, 4, 2, 1]);
    expect(ids("end")).toEqual([3, 4, 1, 2]);
    expect(ids("name")).toEqual([2, 3, 4, 1]);
  });

  it("opsi status mengikuti urutan siklus, PM alfabetis dengan Tanpa PM terakhir", () => {
    expect(getTimelineStatusOptions(scheduled).map((o) => o.value)).toEqual([
      "Planning",
      "Scoping",
      "Done",
    ]);
    expect(getTimelinePmOptions(scheduled)).toEqual([
      { value: "Andi", count: 2 },
      { value: "Sari", count: 1 },
      { value: NO_PM_LABEL, count: 1 },
    ]);
  });
});

describe("paginate", () => {
  it("default pagination bernilai 10 dan mencakup opsi 10", () => {
    expect(DEFAULT_TIMELINE_PAGE_SIZE).toBe(10);
    expect(TIMELINE_PAGE_SIZE_OPTIONS).toContain(10);
  });

  it("memotong halaman dan menjepit nomor halaman", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(items, 1, 20).items).toHaveLength(20);
    expect(paginate(items, 3, 20)).toMatchObject({ page: 3, pageCount: 3 });
    expect(paginate(items, 3, 20).items).toHaveLength(5);
    expect(paginate(items, 9, 20).page).toBe(3);
    expect(paginate([], 1, 20)).toMatchObject({ page: 1, pageCount: 1 });
  });
});

describe("buildTimelineTasks", () => {
  const { scheduled } = partitionScheduled([
    make(1, "A", "2026-01-01", "2026-01-31", "Done", "Sari"),
    make(2, "B", "2026-03-01", "2026-04-15", "Planning", "Andi"),
    make(3, "C", "2026-02-01", "2026-05-10", "Planning", "Andi"),
  ]);

  it("tanpa grup: batang dengan tanggal akhir eksklusif", () => {
    const tasks = buildTimelineTasks(scheduled, "none");
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({
      id: "project:1",
      kind: "project",
      type: "task",
      start: new Date(2026, 0, 1),
      end: new Date(2026, 1, 1),
      endInclusive: new Date(2026, 0, 31),
      statusName: "Done",
      pmName: "Sari",
    });
    expect(tasks.every((t) => t.parent === undefined)).toBe(true);
  });

  it("grup status: baris induk per status dengan rentang gabungan anak", () => {
    const tasks = buildTimelineTasks(scheduled, "status");
    expect(tasks.map((t) => t.id)).toEqual([
      "group:status:Planning",
      "project:2",
      "project:3",
      "group:status:Done",
      "project:1",
    ]);
    expect(tasks[0]).toMatchObject({
      type: "summary",
      kind: "group",
      open: true,
      childCount: 2,
      start: new Date(2026, 1, 1),
      endInclusive: new Date(2026, 4, 10),
    });
    expect(tasks[1]?.parent).toBe("group:status:Planning");
  });

  it("grup PM menghormati grup yang diciutkan", () => {
    const tasks = buildTimelineTasks(scheduled, "pm", new Set(["group:pm:Andi"]));
    expect(tasks.find((t) => t.id === "group:pm:Andi")?.open).toBe(false);
    expect(tasks.find((t) => t.id === "group:pm:Sari")?.open).toBe(true);
  });
});
