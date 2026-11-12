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
  it("pentester saat Retest bisa ubah status ke open, closed, atau reopened", () => {
    expect(allowedFindingStatuses(f("remediated"), "Retest", "pentester", false, true)).toEqual([
      "open",
      "remediated",
      "closed",
      "reopened",
    ]);
  });
  it("tech writer hanya melihat status saat ini karena tidak punya izin ChangeStatus", () => {
    expect(allowedFindingStatuses(f("open"), "Reporting", "technical_writer", false, false)).toEqual(["open"]);
  });
});
