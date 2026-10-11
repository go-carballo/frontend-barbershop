import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/app-shell";
import { StatePanel } from "@/components/shared/state-panel";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { RoleRoute } from "@/features/auth/role-route";

const LoginPage = lazy(() =>
  import("@/pages/login-page").then((module) => ({ default: module.LoginPage })),
);
const OverviewPage = lazy(() =>
  import("@/pages/overview-page").then((module) => ({ default: module.OverviewPage })),
);
const CustomersPage = lazy(() =>
  import("@/pages/customers-page").then((module) => ({ default: module.CustomersPage })),
);
const BarbersPage = lazy(() =>
  import("@/pages/barbers-page").then((module) => ({ default: module.BarbersPage })),
);
const ServicesPage = lazy(() =>
  import("@/pages/services-page").then((module) => ({ default: module.ServicesPage })),
);
const UsersPage = lazy(() =>
  import("@/pages/users-page").then((module) => ({ default: module.UsersPage })),
);
const AppointmentsPage = lazy(() =>
  import("@/pages/appointments-page").then((module) => ({ default: module.AppointmentsPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found-page").then((module) => ({ default: module.NotFoundPage })),
);

const RouteFallback = () => (
  <div className="px-4 py-6">
    <StatePanel kind="loading" title="Cargando vista" description="Preparando BarberShop." />
  </div>
);

export const AppRouter = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/app/overview" element={<OverviewPage />} />
          <Route
            path="/app/customers"
            element={
              <RoleRoute roles={["admin", "barber", "receptionist"]}>
                <CustomersPage />
              </RoleRoute>
            }
          />
          <Route
            path="/app/barbers"
            element={
              <RoleRoute roles={["admin", "barber", "receptionist"]}>
                <BarbersPage />
              </RoleRoute>
            }
          />
          <Route
            path="/app/services"
            element={
              <RoleRoute roles={["admin", "barber", "receptionist"]}>
                <ServicesPage />
              </RoleRoute>
            }
          />
          <Route path="/app/calendar" element={<Navigate to="/app/appointments" replace />} />
          <Route path="/app/appointments" element={<AppointmentsPage />} />
          <Route path="/app/404" element={<NotFoundPage embedded />} />
          <Route
            path="/app/users"
            element={
              <RoleRoute roles={["admin"]}>
                <UsersPage />
              </RoleRoute>
            }
          />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app/overview" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
);
