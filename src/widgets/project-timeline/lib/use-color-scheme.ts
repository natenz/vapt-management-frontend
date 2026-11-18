import { useSyncExternalStore } from "react";

/*
 * Skema warna efektif (atribut data-theme atau preferensi sistem).
 * Dibutuhkan karena SVAR menggambar garis grid chart sebagai gambar dari
 * warna token saat render — Gantt perlu dirender ulang saat tema berganti.
 */
function read(): "light" | "dark" {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  media?.addEventListener?.("change", onChange);
  return () => {
    observer.disconnect();
    media?.removeEventListener?.("change", onChange);
  };
}

export function useColorScheme() {
  return useSyncExternalStore(subscribe, read, () => "light" as const);
}

/** Status media query yang reaktif (mis. untuk kolom grid ringkas di layar sempit). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia?.(query);
      media?.addEventListener?.("change", onChange);
      return () => media?.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia?.(query).matches ?? true,
    () => true,
  );
}
