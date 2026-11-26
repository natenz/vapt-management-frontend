import { describe, expect, it } from "vitest";
import { warningShort, warningText } from "./warnings";

describe("warningText", () => {
  it("menyebut proyek lain dan tanggalnya", () => {
    expect(warningText({ code: "other_project", dates: ["2026-12-03", "2026-12-04"], project_name: "VAPT HRIS" })).toBe(
      "Bentrok dengan VAPT HRIS pada 3 Des 2026, 4 Des 2026",
    );
  });

  it("menyamarkan proyek yang tidak boleh dilihat", () => {
    expect(warningText({ code: "other_project", dates: ["2026-12-03"], project_name: "" })).toBe(
      "Bentrok dengan proyek lain pada 3 Des 2026",
    );
  });

  it("menjelaskan cuti dan kelebihan MD", () => {
    expect(warningText({ code: "approved_leave", dates: ["2026-12-04"] })).toBe("Cuti disetujui pada 4 Des 2026");
    expect(warningText({ code: "pending_leave", dates: ["2026-12-02"] })).toBe("Cuti menunggu persetujuan pada 2 Des 2026");
    expect(warningText({ code: "exceeds_workdays", message: "5 MD melebihi 4 hari kerja efektif" })).toBe(
      "5 MD melebihi 4 hari kerja efektif",
    );
  });

  it("meringkas kode untuk badge", () => {
    expect(warningShort("other_project")).toBe("Proyek lain");
    expect(warningShort("approved_leave")).toBe("Cuti");
    expect(warningShort("pending_leave")).toBe("Cuti menunggu");
    expect(warningShort("exceeds_workdays")).toBe("MD > hari kerja");
    expect(warningShort("lainnya")).toBe("lainnya");
  });
});
