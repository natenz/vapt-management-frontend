import { useLayoutEffect, useRef, useState } from "react";

/**
 * Tinggi agar elemen mengisi sisa layar dari posisi atasnya sampai bawah viewport
 * (dikurangi `bottomGap`, mis. padding bawah halaman). Hanya aktif saat media query
 * `query` cocok; selain itu bernilai undefined (tinggi alami).
 * Posisi dihitung relatif ke kontainer scroll terdekat agar tidak berubah saat di-scroll.
 */
export function useFillHeight<T extends HTMLElement>({
  bottomGap = 32,
  minHeight = 320,
  query = "(min-width: 1024px)",
}: { bottomGap?: number; minHeight?: number; query?: string } = {}) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const scroller = el.closest("main") ?? document.scrollingElement;

    const update = () => {
      if (!mq.matches) return setHeight(undefined);
      const top = el.getBoundingClientRect().top + (scroller?.scrollTop ?? 0);
      setHeight(Math.max(minHeight, Math.floor(window.innerHeight - top - bottomGap)));
    };

    update();
    window.addEventListener("resize", update);
    mq.addEventListener?.("change", update);
    // Konten di atas (KPI, header) bisa berubah tinggi setelah data termuat.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (el.parentElement) ro?.observe(el.parentElement);
    return () => {
      window.removeEventListener("resize", update);
      mq.removeEventListener?.("change", update);
      ro?.disconnect();
    };
  }, [bottomGap, minHeight, query]);

  return { ref, height };
}
