import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LoginResult, User } from "@/shared/api/schemas";

export type SessionState = {
  token: string | null;
  expiresAt: string | null;
  user: User | null;
  setSession: (r: LoginResult) => void;
  clear: () => void;
};

// sessionStorage: sesi hilang saat tab ditutup. BE belum memakai cookie HttpOnly / refresh token.
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      expiresAt: null,
      user: null,
      setSession: (r) => set({ token: r.access_token, expiresAt: r.expires_at, user: r.user }),
      clear: () => set({ token: null, expiresAt: null, user: null }),
    }),
    { name: "vapt-session", storage: createJSONStorage(() => sessionStorage) },
  ),
);

export function isExpired(expiresAt: string | null) {
  return !expiresAt || new Date(expiresAt).getTime() <= Date.now();
}
