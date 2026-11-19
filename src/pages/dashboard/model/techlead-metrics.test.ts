import { describe, expect, it } from "vitest";
import type { Project, ProjectDetail } from "@/entities/project";
import type { User } from "@/entities/user";
import {
  bookedInRange,
  findEarliestSlot,
  loadInRange,
  mondayOf,
  runningProjects,
  timeProgress,
  weeklyHeatmap,
  workingDays,
} from "./techlead-metrics";

const user = (id: number): User => ({
  sys_user_id: id,
  username: `p${id}`,
  email: `p${id}@t`,
  role_id: 4,
  role: { role_id: 4, role_name: "pentester" },
});

const assign = (pentester: number, start: string, end: string, md: number) => ({
  mandays_id: pentester * 100,
  asset_id: 1,
  pentester_id: pentester,
  start_date: start,
  end_date: end,
  allocated_mandays: md,
});

const detail = (id: number, mandays: ReturnType<typeof assign>[]): ProjectDetail =>
  ({
    project_id: id,
    project_name: `Proyek ${id}`,
    client_name: "Klien",
    total_mandays: 0,
    projected_mandays: 0,
    pm_id: 1,
    status: { status_process_id: 4, status_name: "Assessment" },
    assets: [],
    resources: [],
    stages: [],
    mandays,
  }) as ProjectDetail;

describe("kalender & porsi mandays", () => {
  it("menghitung hari kerja Senin–Jumat", () => {
    expect(workingDays("2026-11-23", "2026-12-06")).toBe(10); // 2 minggu
    expect(workingDays("2026-11-21", "2026-11-22")).toBe(0); // akhir pekan
  });

  it("Senin dari tanggal apa pun pada minggunya", () => {
    expect(mondayOf("2026-11-19")).toBe("2026-11-16"); // Kamis
    expect(mondayOf("2026-11-22")).toBe("2026-11-16"); // Minggu
  });

  it("membagi rata MD penugasan dan mengambil porsi di rentang", () => {
    const m = assign(1, "2026-11-01", "2026-11-10", 10);
    expect(bookedInRange(m, "2026-11-06", "2026-11-30")).toBe(5);
    expect(bookedInRange(m, "2026-12-01", "2026-12-31")).toBe(0);
  });
});

describe("beban & slot", () => {
  const users = [user(1), user(2), user(3)];
  const details = [
    detail(10, [
      assign(2, "2026-11-23", "2026-12-06", 20), // penuh 2 minggu
      assign(3, "2026-11-23", "2026-12-06", 7), // 70%
    ]),
  ];

  it("mengurutkan pentester dari yang paling longgar dan memberi level", () => {
    const rows = loadInRange(users, details, "2026-11-23", "2026-12-06");
    expect(rows.map((r) => [r.user.sys_user_id, r.booked, r.level])).toEqual([
      [1, 0, "free"],
      [3, 7, "busy"],
      [2, 20, "full"],
    ]);
    expect(rows[2]?.projects).toEqual([{ id: 10, name: "Proyek 10" }]);
  });

  it("heatmap mingguan dimulai dari minggu ini", () => {
    const { weeks, rows } = weeklyHeatmap(users, details, 3, "2026-11-19");
    expect(weeks.map((w) => w.start)).toEqual(["2026-11-16", "2026-11-23", "2026-11-30"]);
    const citra = rows.find((r) => r.user.sys_user_id === 2)!;
    expect(citra.cells[0]?.booked).toBe(0);
    expect(citra.cells[1]?.level).toBe("full");
  });

  it("slot tercepat adalah Senin pertama dengan cukup pentester longgar", () => {
    const slot = findEarliestSlot({
      pentesters: users,
      details,
      durationDays: 14,
      teamSize: 2,
      from: "2026-11-20",
    });
    expect(slot?.start).toBe("2026-11-30");
    expect(slot?.end).toBe("2026-12-13");
    expect(slot?.candidates.map((c) => c.user.sys_user_id)).toEqual([1, 3]);
    expect(
      findEarliestSlot({ pentesters: users, details, durationDays: 14, teamSize: 4, from: "2026-11-20" }),
    ).toBeNull();
  });
});

describe("proyek berjalan", () => {
  const proj = (id: number, status: string, start: string, end: string): Project => ({
    project_id: id,
    project_name: `P${id}`,
    client_name: "K",
    total_mandays: 0,
    projected_mandays: 0,
    pm_id: 1,
    start_date: start,
    end_date: end,
    status: { status_process_id: id, status_name: status },
  });

  it("persentase waktu terpakai dibatasi 0–100", () => {
    expect(timeProgress("2026-11-01", "2026-11-11", "2026-11-06")).toBe(50);
    expect(timeProgress("2026-11-01", "2026-11-11", "2026-12-01")).toBe(100);
    expect(timeProgress(null, "2026-11-11")).toBeNull();
  });

  it("menandai terlambat dan berisiko, urut dari yang paling bermasalah", () => {
    const rows = runningProjects(
      [
        proj(1, "Final Presentation", "2026-11-01", "2026-12-31"), // sesuai jadwal
        proj(2, "Scoping", "2026-11-01", "2026-11-25"), // waktu 75%, tahap 11% → berisiko
        proj(3, "Assessment", "2026-10-01", "2026-11-10"), // lewat tenggat
        proj(4, "Done", "2026-10-01", "2026-10-10"),
      ],
      "2026-11-19",
    );
    expect(rows.map((r) => [r.project.project_id, r.health])).toEqual([
      [3, "late"],
      [2, "at-risk"],
      [1, "on-track"],
    ]);
  });
});
