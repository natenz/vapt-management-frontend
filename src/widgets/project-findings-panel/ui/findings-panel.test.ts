import { describe, expect, it } from "vitest";
import type { Finding } from "@/entities/finding";
import { allowedFindingStatuses, statusActions } from "./findings-panel";

const f = (status: string) => ({ status }) as Finding;
const to = (a: { to: string }[]) => a.map((x) => x.to);

// Cermin hasil tes ke BE: remediated oleh PM/TL/admin (Remediation/Retest), closed/reopened oleh pentester saat Retest.
describe("statusActions", () => {
  it("PM pemilik: bisa tandai diperbaiki saat Remediation, tidak bisa verifikasi", () => {
    expect(to(statusActions(f("open"), "Remediation", "project_manager", true))).toEqual(["remediated"]);
  });
  it("pentester: lolos/masih rentan hanya saat Retest dan setelah diperbaiki", () => {
    expect(to(statusActions(f("remediated"), "Retest", "pentester", false))).toEqual(["closed", "reopened"]);
    expect(statusActions(f("remediated"), "Remediation", "pentester", false)).toEqual([]);
    expect(statusActions(f("open"), "Retest", "pentester", false)).toEqual([]);
  });
  it("tech writer dan temuan closed: tanpa aksi", () => {
    expect(statusActions(f("open"), "Retest", "technical_writer", false)).toEqual([]);
    expect(statusActions(f("closed"), "Retest", "project_manager", true)).toEqual([]);
  });
  it("di luar Remediation/Retest: tanpa aksi", () => {
    expect(statusActions(f("open"), "Pentest", "super_admin", true)).toEqual([]);
  });
});

describe("allowedFindingStatuses", () => {
  it("pentester dan PM pemilik bisa ubah ke semua status selama tahap aktif", () => {
    expect(allowedFindingStatuses(f("open"), "Pentest", "pentester", false)).toEqual([
      "open",
      "remediated",
      "closed",
      "reopened",
    ]);
    expect(allowedFindingStatuses(f("open"), "Remediation", "project_manager", true)).toEqual([
      "open",
      "remediated",
      "closed",
      "reopened",
    ]);
  });
  it("tech writer atau status Done hanya melihat status saat ini", () => {
    expect(allowedFindingStatuses(f("open"), "Reporting", "technical_writer", false)).toEqual(["open"]);
    expect(allowedFindingStatuses(f("closed"), "Done", "pentester", false)).toEqual(["closed"]);
  });
});
