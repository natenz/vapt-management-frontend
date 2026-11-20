import { expect, it } from "vitest";
import { findingSchema } from "./schemas";

it("membaca CVSS teks lengkap dan menormalkan angka dari backend lama", () => {
  const schema = findingSchema.pick({ cvss_score: true });
  const cvss = "8.1 — CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N";
  expect(schema.parse({ cvss_score: cvss })).toEqual({ cvss_score: cvss });
  expect(schema.parse({ cvss_score: 8.1 })).toEqual({ cvss_score: "8.1" });
  expect(schema.parse({ cvss_score: 0 })).toEqual({ cvss_score: "0" });
  expect(schema.parse({ cvss_score: null })).toEqual({ cvss_score: null });
  expect(schema.parse({ cvss_score: "" })).toEqual({ cvss_score: "" });
  expect(schema.safeParse({ cvss_score: true }).success).toBe(false);
});
