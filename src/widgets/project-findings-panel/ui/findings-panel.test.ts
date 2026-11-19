import { describe, expect, it } from "vitest";
import type { Finding } from "@/entities/finding";
import { allowedFindingStatuses } from "./findings-panel";

const f = (status: string) => ({ status }) as Finding;
const ALL = ["open", "closed", "closed_with_note"];

// Mirror BE: hanya pentester dan technical writer yang boleh mengubah status temuan, dan hanya di tahap yang terbuka.
describe("allowedFindingStatuses", () => {
  it("pentester dan technical writer bisa pilih ketiga status saat tahap terbuka", () => {
    expect(allowedFindingStatuses(f("open"), "Assessment", "pentester")).toEqual(ALL);
    expect(allowedFindingStatuses(f("open"), "Retesting", "pentester")).toEqual(ALL);
    expect(allowedFindingStatuses(f("open"), "Initial Report", "technical_writer")).toEqual(ALL);
    expect(allowedFindingStatuses(f("open"), "Final Report Drafting", "technical_writer")).toEqual(ALL);
  });
  it("PM, Tech Lead, dan superadmin hanya melihat, tidak bisa mengubah", () => {
    for (const role of ["project_manager", "tech_lead", "super_admin"]) {
      expect(allowedFindingStatuses(f("open"), "Retesting", role)).toEqual(["open"]);
    }
  });
  it("terkunci saat Remediasi, Final Presentation, dan Done", () => {
    for (const st of ["Remediasi", "Final Presentation", "Done"]) {
      expect(allowedFindingStatuses(f("closed"), st, "pentester")).toEqual(["closed"]);
      expect(allowedFindingStatuses(f("open"), st, "technical_writer")).toEqual(["open"]);
    }
  });
});
