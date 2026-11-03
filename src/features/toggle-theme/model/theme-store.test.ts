import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY, useThemeStore } from "./theme-store";

function reset() {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  useThemeStore.setState({ theme: "system" });
}

describe("store tema", () => {
  beforeEach(reset);

  it("memakai kunci penyimpanan yang sama dengan script anti-kedip", () => {
    expect(STORAGE_KEY).toBe("vermilion-theme");
  });

  it("menyimpan pilihan eksplisit sebagai string biasa", () => {
    useThemeStore.getState().setTheme("dark");

    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("memasang data-theme untuk pilihan eksplisit", () => {
    useThemeStore.getState().setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    useThemeStore.getState().setTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("menghapus atribut dan kunci saat kembali ikut sistem", () => {
    useThemeStore.getState().setTheme("dark");
    useThemeStore.getState().setTheme("system");

    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("berputar terang, gelap, lalu ikut sistem", () => {
    useThemeStore.getState().setTheme("light");

    useThemeStore.getState().cycleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");

    useThemeStore.getState().cycleTheme();
    expect(useThemeStore.getState().theme).toBe("system");

    useThemeStore.getState().cycleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
  });
});
