/**
 * Menguji deret halaman dengan elipsis.
 *
 * Halaman pertama dan terakhir harus SELALU terlihat — tanpa itu, orang di
 * halaman 7 dari 20 tidak punya cara melompat ke ujung.
 */
import { describe, expect, it } from "vitest";
import { pageWindow } from "./pagination";

describe("pageWindow", () => {
  it("menampilkan semua halaman saat jumlahnya sedikit", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("selalu menyertakan halaman pertama dan terakhir", () => {
    const window = pageWindow(10, 20);
    expect(window[0]).toBe(1);
    expect(window[window.length - 1]).toBe(20);
  });

  it("menyisipkan elipsis di kedua sisi saat berada di tengah", () => {
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
  });

  it("tidak menyisipkan elipsis untuk satu halaman yang terlewat", () => {
    // Antara 1 dan 2 tidak ada yang tersembunyi, jadi tidak perlu elipsis.
    expect(pageWindow(2, 20)).toEqual([1, 2, 3, "gap", 20]);
  });

  it("tidak pernah menghasilkan halaman di luar rentang", () => {
    for (const page of [1, 20]) {
      const numbers = pageWindow(page, 20).filter((p): p is number => p !== "gap");
      expect(Math.min(...numbers)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...numbers)).toBeLessThanOrEqual(20);
    }
  });
});
