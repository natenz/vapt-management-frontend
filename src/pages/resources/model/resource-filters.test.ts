import { describe, expect, it } from "vitest";
import type { ResourceRow } from "./resource-filters";
import {
  applyResourceFilters,
  getResourceRoleOptions,
  hasAnyFilter,
  parsePageSize,
  parseResourceFilters,
  writePageSize,
  writeResourceFilters,
} from "./resource-filters";

const mockRows: ResourceRow[] = [
  {
    user: {
      sys_user_id: 1,
      username: "pentester.budi",
      email: "budi@vapt.local",
      role_id: 4,
      role: { role_id: 4, role_name: "pentester" },
      profile: { user_id: 1, full_name: "Budi Santoso", department: "Offensive Security" },
    },
    load: { mandays: 10, projects: [{ id: 1, name: "VAPT Banking" }] },
  },
  {
    user: {
      sys_user_id: 2,
      username: "writer.eka",
      email: "eka@vapt.local",
      role_id: 5,
      role: { role_id: 5, role_name: "technical_writer" },
      profile: { user_id: 2, full_name: "Eka Putri", department: "Documentation" },
    },
    load: { mandays: 0, projects: [{ id: 1, name: "VAPT Banking" }] },
  },
  {
    user: {
      sys_user_id: 3,
      username: "pm.andi",
      email: "andi@vapt.local",
      role_id: 3,
      role: { role_id: 3, role_name: "project_manager" },
      profile: { user_id: 3, full_name: "Andi Wijaya", department: "PMO" },
    },
    load: { mandays: 0, projects: [] },
  },
];

describe("resource-filters", () => {
  it("menyaring resource berdasarkan search (nama, username, proyek, departemen)", () => {
    const resProject = applyResourceFilters(mockRows, { search: "banking", roles: [], month: "2026-03" });
    expect(resProject).toHaveLength(2);

    const resName = applyResourceFilters(mockRows, { search: "eka", roles: [], month: "2026-03" });
    expect(resName).toHaveLength(1);
    expect(resName[0]?.user.username).toBe("writer.eka");
  });

  it("menyaring resource berdasarkan role", () => {
    const resRole = applyResourceFilters(mockRows, { search: "", roles: ["pentester"], month: "2026-03" });
    expect(resRole).toHaveLength(1);
    expect(resRole[0]?.user.username).toBe("pentester.budi");
  });

  it("menghasilkan opsi role faset yang sesuai", () => {
    const opts = getResourceRoleOptions(mockRows);
    expect(opts.find((o) => o.value === "pentester")?.count).toBe(1);
    expect(opts.find((o) => o.value === "technical_writer")?.count).toBe(1);
    expect(opts.find((o) => o.value === "project_manager")?.count).toBe(1);
  });

  it("melakukan sinkronisasi URLSearchParams dan pageSize", () => {
    const params = new URLSearchParams("q=budi&role=pentester&bulan=2026-04&per=50");
    const parsed = parseResourceFilters(params, "2026-03");
    expect(parsed.search).toBe("budi");
    expect(parsed.roles).toEqual(["pentester"]);
    expect(parsed.month).toBe("2026-04");
    expect(parsePageSize(params)).toBe(50);

    const written = writeResourceFilters(parsed, "2026-03");
    expect(written.get("q")).toBe("budi");
    expect(written.get("role")).toBe("pentester");
    expect(written.get("bulan")).toBe("2026-04");

    const writtenPage = writePageSize(50, new URLSearchParams());
    expect(writtenPage.get("per")).toBe("50");
  });

  it("mendeteksi apakah ada filter aktif", () => {
    expect(hasAnyFilter({ search: "", roles: [], month: "2026-03" }, "2026-03")).toBe(false);
    expect(hasAnyFilter({ search: "a", roles: [], month: "2026-03" }, "2026-03")).toBe(true);
    expect(hasAnyFilter({ search: "", roles: ["pentester"], month: "2026-03" }, "2026-03")).toBe(true);
    expect(hasAnyFilter({ search: "", roles: [], month: "2026-04" }, "2026-03")).toBe(true);
  });
});
