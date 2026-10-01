import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { canAccess } from "@/lib/rbac";
import type { AppRole } from "@/types";

export const RoleRoute = ({ roles, children }: { roles: AppRole[]; children: ReactNode }) => {
  const { isAuthenticated, session } = useAuth();

  // Without a session there is no role to check, so fall through to the login
  // redirect instead of rendering a restricted view.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // `role` is already normalized from the backend value (`admin`, `barber`,
  // `receptionist`) by `normalizeRole`. An unknown role resolves to `undefined`
  // and is denied by `canAccess`.
  if (!canAccess(session?.user.role, roles)) {
    return <Navigate to="/app/overview" replace />;
  }

  return <>{children}</>;
};
