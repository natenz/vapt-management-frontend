import { parseISO } from "date-fns";
import { describe, expect, it } from "vitest";
import { workingSegments } from "./work-calendar";

describe("workingSegments", () => {
  it("menyisakan celah akhir pekan dan libur tambahan, termasuk pergantian bulan", () => {
    const pieces = workingSegments(parseISO("2026-07-31"), parseISO("2026-08-05"), ["2026-08-04"]);
    expect(pieces.map((p) => [p.startsAt, p.endsAt, p.days])).toEqual([
      ["2026-07-31", "2026-07-31", 1], ["2026-08-03", "2026-08-03", 1], ["2026-08-05", "2026-08-05", 1],
    ]);
    expect(pieces[1]!.left).toBe(50);
    expect(pieces[0]!.width).toBeCloseTo(100 / 6);
  });
  it("rentang yang seluruhnya libur tidak menghasilkan batang kerja", () => {
    expect(workingSegments(parseISO("2026-08-01"), parseISO("2026-08-02"))).toEqual([]);
    expect(workingSegments(parseISO("2026-08-03"), parseISO("2026-08-03"), ["2026-08-03"])).toEqual([]);
  });
  it("tetap mendukung kalender biasa untuk pemakai Gantt lainnya", () => {
    expect(workingSegments(parseISO("2026-08-01"), parseISO("2026-08-03"), [], false)).toEqual([
      { startsAt: "2026-08-01", endsAt: "2026-08-03", left: 0, width: 100, days: 3 },
    ]);
    expect(workingSegments(parseISO("2026-08-03"), parseISO("2026-08-01"))).toEqual([]);
  });
});
