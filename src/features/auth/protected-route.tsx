import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";

export const ProtectedRoute = () => {
  const { session, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !session?.accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
