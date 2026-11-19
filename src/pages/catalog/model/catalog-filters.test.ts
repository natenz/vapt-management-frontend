import { describe, expect, it } from "vitest";
import type { CatalogVulna } from "@/entities/catalog";
import {
  applyCatalogFilters,
  getSeverityOptions,
  hasAnyFilter,
  parseCatalogFilters,
  parseCatalogView,
  parsePageSize,
  writeCatalogFilters,
  writeCatalogView,
  writePageSize,
} from "./catalog-filters";

const mockItems: CatalogVulna[] = [
  {
    vulna_id: 1,
    title: "SQL Injection",
    severity: "Critical",
    cvss_score: 9.8,
    remediation_recommendation: "Gunakan parameterized queries",
    status: "approved",
  },
  {
    vulna_id: 2,
    title: "Cross-Site Scripting (Reflected)",
    severity: "High",
    cvss_score: 7.5,
    remediation_recommendation: "Escape output HTML",
    status: "approved",
  },
  {
    vulna_id: 3,
    title: "Information Disclosure via Headers",
    severity: "Low",
    cvss_score: 3.1,
    remediation_recommendation: "Hapus header Server dan X-Powered-By",
    status: "pending",
  },
];

describe("catalog-filters", () => {
  it("menyaring vulnerability berdasarkan pencarian teks", () => {
    const resSql = applyCatalogFilters(mockItems, { search: "sql", severities: [] });
    expect(resSql).toHaveLength(1);
    expect(resSql[0]?.title).toBe("SQL Injection");

    const resRec = applyCatalogFilters(mockItems, { search: "parameterized", severities: [] });
    expect(resRec).toHaveLength(1);
  });

  it("menyaring vulnerability berdasarkan severity", () => {
    const resSev = applyCatalogFilters(mockItems, { search: "", severities: ["Critical", "High"] });
    expect(resSev).toHaveLength(2);
  });

  it("menghitung opsi severity faset", () => {
    const opts = getSeverityOptions(mockItems);
    expect(opts.find((o) => o.value === "Critical")?.count).toBe(1);
    expect(opts.find((o) => o.value === "High")?.count).toBe(1);
    expect(opts.find((o) => o.value === "Low")?.count).toBe(1);
    expect(opts.find((o) => o.value === "Medium")?.count).toBe(0);
  });

  it("melakukan sinkronisasi URLSearchParams dan pageSize", () => {
    const params = new URLSearchParams("q=xss&severity=High&per=50");
    const parsed = parseCatalogFilters(params);
    expect(parsed.search).toBe("xss");
    expect(parsed.severities).toEqual(["High"]);
    expect(parsePageSize(params)).toBe(50);

    const written = writeCatalogFilters(parsed);
    expect(written.get("q")).toBe("xss");
    expect(written.get("severity")).toBe("High");

    const writtenPage = writePageSize(50, new URLSearchParams());
    expect(writtenPage.get("per")).toBe("50");
  });

  it("mendeteksi apakah ada filter aktif", () => {
    expect(hasAnyFilter({ search: "", severities: [] })).toBe(false);
    expect(hasAnyFilter({ search: "a", severities: [] })).toBe(true);
    expect(hasAnyFilter({ search: "", severities: ["High"] })).toBe(true);
  });
});

describe("parseCatalogView / writeCatalogView", () => {
  it("default ke Disetujui dan menolak status yang tidak diizinkan peran", () => {
    expect(parseCatalogView(new URLSearchParams(), ["approved", "pending"])).toBe("approved");
    expect(parseCatalogView(new URLSearchParams("status=pending"), ["approved", "pending"])).toBe("pending");
    expect(parseCatalogView(new URLSearchParams("status=submissions"), ["approved", "pending"])).toBe("approved");
  });

  it("menghapus param saat kembali ke Disetujui dan mempertahankan param lain", () => {
    const base = new URLSearchParams("q=sql");
    expect(writeCatalogView("pending", base).toString()).toBe("q=sql&status=pending");
    expect(writeCatalogView("approved", new URLSearchParams("q=sql&status=pending")).toString()).toBe("q=sql");
  });
});
