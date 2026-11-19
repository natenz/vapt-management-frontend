import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { isExpired, useSession } from "@/entities/session";
import { isRole, type RoleName } from "@/shared/config/roles";
import { Alert } from "@/shared/ui/alert";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: readonly RoleName[] }) {
  const { token, expiresAt, user, signedOut } = useSession();
  const location = useLocation();
  if (!token || !user || isExpired(expiresAt)) {
    // Sesi habis: ingat halaman ini. Keluar sengaja: jangan, supaya login berikutnya ke dashboard.
    return <Navigate to="/login" replace state={signedOut ? null : { from: location.pathname }} />;
  }
  const role = user.role?.role_name;
  if (roles && !(isRole(role) && roles.includes(role))) {
    return (
      <div className="p-6">
        <Alert tone="warning" title="Kamu tidak punya akses ke halaman ini">
          Akun Anda tidak memiliki akses ke halaman ini.
        </Alert>
      </div>
    );
  }
  return children;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { token, expiresAt } = useSession();
  return token && !isExpired(expiresAt) ? <Navigate to="/dashboard" replace /> : children;
}
