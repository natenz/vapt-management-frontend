import { describe, expect, it } from "vitest";
import type { ProjectDetail } from "@/entities/project";
import type { User } from "@/entities/user";
import {
  DEFAULT_RESOURCE_TIMELINE_FILTERS,
  buildResourceTimelineTasks,
} from "./resource-timeline-tasks";

const user = (id: number, username: string, role: string, name: string): User => ({
  sys_user_id: id,
  username,
  email: `${username}@telkom.co.id`,
  role_id: 1,
  role: { role_id: 1, role_name: role },
  profile: { user_id: id, full_name: name, department: "Offensive Security" },
});

const mockUsers: User[] = [
  user(5, "pentester.budi", "pentester", "Budi Santoso"),
  user(6, "pentester.citra", "pentester", "Citra Maharani"),
  user(3, "pm.andi", "project_manager", "Andi PM"),
  user(8, "writer.eka", "technical_writer", "Eka Writer"),
];

const mockProjects = [
  {
    project_id: 101,
    project_name: "Payment Gateway",
    start_date: "2026-11-01",
    end_date: "2026-11-20",
    pm_id: 3,
    status: { status_name: "Assessment" },
    mandays: [
      {
        mandays_id: 1,
        pentester_id: 5,
        start_date: "2026-11-05",
        end_date: "2026-11-15",
        allocated_mandays: 10,
        asset: { asset_name: "API Service" },
      },
    ],
    resources: [],
  },
  {
    project_id: 102,
    project_name: "HRIS Revamp",
    start_date: "2026-11-10",
    end_date: "2026-11-30",
    pm_id: 3,
    status: { status_name: "Scoping" },
    mandays: [
      {
        mandays_id: 2,
        pentester_id: 5,
        start_date: "2026-11-16",
        end_date: "2026-11-25",
        allocated_mandays: 12,
        asset: { asset_name: "Web Portal" },
      },
    ],
    resources: [
      {
        resource_id: 80,
        user_id: 8,
        user: { sys_user: { sys_user_id: 8 } },
      },
    ],
  },
] as unknown as ProjectDetail[];

const testRange = {
  start: new Date("2026-11-01T00:00:00"),
  end: new Date("2026-11-30T00:00:00"),
};

describe("buildResourceTimelineTasks", () => {
  it("membangun hirarki task dengan user sebagai parent dan mandays sebagai child task", () => {
    const tasks = buildResourceTimelineTasks(
      mockUsers,
      mockProjects,
      DEFAULT_RESOURCE_TIMELINE_FILTERS,
      testRange,
      new Set(),
      { 5: { mandays: 22 } },
    );

    const budiRow = tasks.find((t) => t.id === "user:5");
    expect(budiRow).toBeDefined();
    expect(budiRow?.type).toBe("summary");
    expect(budiRow?.userName).toBe("Budi Santoso");
    expect(budiRow?.childCount).toBe(2);
    expect(budiRow?.totalMandays).toBe(22);
    expect(budiRow).not.toHaveProperty("isOverloaded"); // tidak ada penilaian batas beban

    const budiAssignments = tasks.filter((t) => t.parent === "user:5");
    expect(budiAssignments).toHaveLength(2);
    expect(budiAssignments[0]?.text).toContain("Payment Gateway");
    expect(budiAssignments[0]?.assetName).toBe("API Service");
    expect(budiAssignments[1]?.text).toContain("HRIS Revamp");
  });

  it("mencatat PM dan writer ke penugasan proyek", () => {
    const tasks = buildResourceTimelineTasks(
      mockUsers,
      mockProjects,
      DEFAULT_RESOURCE_TIMELINE_FILTERS,
      testRange,
      new Set(),
    );

    const andiPm = tasks.filter((t) => t.parent === "user:3");
    expect(andiPm.length).toBeGreaterThanOrEqual(1);
    expect(andiPm[0]?.text).toContain("(PM)");

    const ekaWriter = tasks.filter((t) => t.parent === "user:8");
    expect(ekaWriter.length).toBeGreaterThanOrEqual(1);
    expect(ekaWriter[0]?.text).toContain("HRIS Revamp");
  });

  it("menyaring berdasarkan role", () => {
    const tasks = buildResourceTimelineTasks(
      mockUsers,
      mockProjects,
      { ...DEFAULT_RESOURCE_TIMELINE_FILTERS, roles: ["pentester"] },
      testRange,
      new Set(),
    );

    const userRows = tasks.filter((t) => t.kind === "user");
    expect(userRows.every((u) => u.roleName === "pentester")).toBe(true);
    expect(userRows.some((u) => u.userId === 3)).toBe(false);
  });

  it("menyaring berdasarkan kata kunci pencarian", () => {
    const tasks = buildResourceTimelineTasks(
      mockUsers,
      mockProjects,
      { ...DEFAULT_RESOURCE_TIMELINE_FILTERS, search: "Payment" },
      testRange,
      new Set(),
    );

    const userRows = tasks.filter((t) => t.kind === "user");
    // Budi Santoso (memiliki Payment Gateway) & Andi PM (PM Payment Gateway)
    expect(userRows.some((u) => u.userName === "Budi Santoso")).toBe(true);
    expect(userRows.some((u) => u.userName === "Andi PM")).toBe(true);
    // Citra tidak terlibat di Payment
    expect(userRows.some((u) => u.userName === "Citra Maharani")).toBe(false);
  });
});
