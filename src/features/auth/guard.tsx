import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { isExpired, useSession } from "@/entities/session";
import { isRole } from "@/shared/config/roles";
import type { RoleName } from "@/shared/api/schemas";
import { Alert } from "@/shared/ui/alert";

export function RequireAuth({ children, roles }: { children: ReactNode; roles?: readonly RoleName[] }) {
  const { token, expiresAt, user } = useSession();
  const location = useLocation();
  if (!token || !user || isExpired(expiresAt)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  const role = user.role?.role_name;
  if (roles && !(isRole(role) && roles.includes(role))) {
    return (
      <div className="p-6">
        <Alert tone="warning" title="Halaman tidak tersedia untuk peran ini">
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
