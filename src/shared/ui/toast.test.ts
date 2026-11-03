/**
 * Menguji aturan § Alert yang paling mudah dilanggar tanpa sadar:
 *
 *   "Inline alerts persist until resolved; transient confirmations fade after
 *    6 seconds and are never errors."
 *
 * Karena itu modul toast sengaja tidak punya `error`. Tes ini menjaga supaya
 * tidak ada yang menambahkannya "sebentar saja" di kemudian hari — kalau
 * ditambahkan, tes ini gagal dan memaksa diskusi ulang.
 */
import { describe, expect, it } from "vitest";
import { notify, TRANSIENT_DURATION_MS, MAX_VISIBLE } from "./toast";

describe("notify", () => {
  it("hanya mengekspos konfirmasi sesaat, tidak pernah error", () => {
    expect(Object.keys(notify).sort()).toEqual(["dismiss", "info", "success"]);
    expect(notify).not.toHaveProperty("error");
    expect(notify).not.toHaveProperty("warning");
  });

  it("memakai durasi 6 detik sesuai spec", () => {
    expect(TRANSIENT_DURATION_MS).toBe(6000);
  });

  it('menumpuk paling banyak tiga, sesuai "stack at most three"', () => {
    expect(MAX_VISIBLE).toBe(3);
  });
});
