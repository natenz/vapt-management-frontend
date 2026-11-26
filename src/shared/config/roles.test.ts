import { describe, expect, it } from "vitest";
import { navFor } from "./roles";

const labels = (role: string) => navFor(role).map((i) => i.label);

describe("navFor: menu Kalender", () => {
  it("muncul untuk superadmin, tech lead, PM, dan pentester, tepat setelah Resource bila ada", () => {
    for (const role of ["super_admin", "tech_lead", "project_manager", "pentester"]) {
      expect(labels(role), role).toContain("Kalender");
    }
    const tl = labels("tech_lead");
    expect(tl.indexOf("Kalender")).toBe(tl.indexOf("Resource") + 1);
    expect(navFor("pentester").find((i) => i.label === "Kalender")?.to).toBe("/calendar");
  });

  it("tidak muncul untuk technical writer", () => {
    expect(labels("technical_writer")).not.toContain("Kalender");
  });
});
