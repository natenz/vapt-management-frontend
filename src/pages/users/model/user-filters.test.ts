import { describe, expect, it } from "vitest";
import type { User } from "@/entities/user";
import {
  applyUserFilters,
  getRoleOptions,
  hasAnyFilter,
  parsePageSize,
  parseUserFilters,
  writePageSize,
  writeUserFilters,
} from "./user-filters";

const mockUsers: User[] = [
  {
    sys_user_id: 1,
    username: "superadmin",
    email: "admin@vapt.local",
    role_id: 1,
    role: { role_id: 1, role_name: "super_admin" },
    profile: { user_id: 1, full_name: "Super Admin", department: "IT Security" },
  },
  {
    sys_user_id: 2,
    username: "techlead",
    email: "lead@vapt.local",
    role_id: 2,
    role: { role_id: 2, role_name: "tech_lead" },
    profile: { user_id: 2, full_name: "Tech Lead", department: "AppSec" },
  },
  {
    sys_user_id: 3,
    username: "pentester.budi",
    email: "budi@vapt.local",
    role_id: 4,
    role: { role_id: 4, role_name: "pentester" },
    profile: { user_id: 3, full_name: "Budi Santoso", department: "Red Team" },
  },
];

describe("user-filters", () => {
  it("menyaring pengguna berdasarkan teks pencarian (nama, username, email, departemen)", () => {
    const resName = applyUserFilters(mockUsers, { search: "budi", roles: [] });
    expect(resName).toHaveLength(1);
    expect(resName[0]?.username).toBe("pentester.budi");

    const resDept = applyUserFilters(mockUsers, { search: "appsec", roles: [] });
    expect(resDept).toHaveLength(1);
    expect(resDept[0]?.username).toBe("techlead");
  });

  it("menyaring pengguna berdasarkan role", () => {
    const resRole = applyUserFilters(mockUsers, { search: "", roles: ["super_admin", "tech_lead"] });
    expect(resRole).toHaveLength(2);
  });

  it("menghitung opsi faset role dengan benar", () => {
    const opts = getRoleOptions(mockUsers);
    expect(opts.find((o) => o.value === "super_admin")?.count).toBe(1);
    expect(opts.find((o) => o.value === "pentester")?.count).toBe(1);
  });

  it("melakukan sinkronisasi URLSearchParams dan pageSize", () => {
    const params = new URLSearchParams("q=admin&role=super_admin&per=50");
    const parsed = parseUserFilters(params);
    expect(parsed.search).toBe("admin");
    expect(parsed.roles).toEqual(["super_admin"]);
    expect(parsePageSize(params)).toBe(50);

    const written = writeUserFilters(parsed);
    expect(written.get("q")).toBe("admin");
    expect(written.get("role")).toBe("super_admin");

    const writtenPage = writePageSize(50, new URLSearchParams());
    expect(writtenPage.get("per")).toBe("50");
  });

  it("mendeteksi apakah ada filter yang aktif", () => {
    expect(hasAnyFilter({ search: "", roles: [] })).toBe(false);
    expect(hasAnyFilter({ search: "a", roles: [] })).toBe(true);
    expect(hasAnyFilter({ search: "", roles: ["pentester"] })).toBe(true);
  });
});
