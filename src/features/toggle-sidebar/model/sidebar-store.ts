import { create } from "zustand";

const STORAGE_KEY = "vermilion-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistCollapsed(collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Preferensi boleh hilang saat penyimpanan browser tidak tersedia.
  }
}

type SidebarState = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: readCollapsed(),

  toggleCollapsed: () => {
    const next = !get().collapsed;
    persistCollapsed(next);
    set({ collapsed: next });
  },
}));

export { STORAGE_KEY as SIDEBAR_STORAGE_KEY };
