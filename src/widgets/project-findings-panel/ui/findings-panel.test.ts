import { describe, expect, it } from "vitest";
import type { Finding } from "@/entities/finding";
import { allowedFindingStatuses } from "./findings-panel";

const f = (status: string) => ({ status }) as Finding;

// Mirror BE: status temuan cuma open/closed. Bisa diubah pentester atau PM pemilik saat tahap temuan terbuka, terkunci saat Remediasi.
describe("allowedFindingStatuses", () => {
  it("pentester dan PM pemilik bisa pilih Terbuka atau Ditutup saat Assessment/Retesting", () => {
    expect(allowedFindingStatuses(f("open"), "Assessment", "pentester", false)).toEqual(["open", "closed"]);
    expect(allowedFindingStatuses(f("open"), "Retesting", "project_manager", true)).toEqual(["open", "closed"]);
  });
  it("terkunci saat Remediasi", () => {
    expect(allowedFindingStatuses(f("open"), "Remediasi", "pentester", false)).toEqual(["open"]);
    expect(allowedFindingStatuses(f("open"), "Remediasi", "project_manager", true)).toEqual(["open"]);
  });
  it("tech writer atau status Done hanya melihat status saat ini", () => {
    expect(allowedFindingStatuses(f("open"), "Initial Report", "technical_writer", false)).toEqual(["open"]);
    expect(allowedFindingStatuses(f("closed"), "Done", "pentester", false)).toEqual(["closed"]);
  });
});
