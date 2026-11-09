import { describe, expect, it } from "vitest";
import { mandaysState } from "./gantt-state";

const today = new Date("2026-11-09");
const m = (status: string, start = "2026-11-02") => ({ status, start_date: start });

describe("mandaysState", () => {
  it("selesai tahap Pentest => done, walau mandays.status masih planned (kondisi nyata BE)", () => {
    for (const s of ["Reporting", "Remediation", "Retest", "Done"]) expect(mandaysState(m("planned"), s, today)).toBe("done");
  });
  it("Draft/Planning => todo", () => {
    expect(mandaysState(m("planned"), "Planning", today)).toBe("todo");
    expect(mandaysState(m("planned"), "Draft", today)).toBe("todo");
  });
  it("Pentest: sudah mulai => current, belum mulai => todo", () => {
    expect(mandaysState(m("planned", "2026-11-02"), "Pentest", today)).toBe("current");
    expect(mandaysState(m("planned", "2026-12-01"), "Pentest", today)).toBe("todo");
  });
  it("status baris tetap dihormati", () => {
    expect(mandaysState(m("done"), "Pentest", today)).toBe("done");
    expect(mandaysState(m("in_progress", "2026-12-01"), "Planning", today)).toBe("current");
  });
});
