import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultSession } from "@/mocks/data";
import { makeAppointment, useAppointmentsFixture } from "@/test/appointments-fixtures";
import { renderApp } from "@/test/test-app";

// jsdom signals belong to a different realm than Node fetch, so React Query
// AbortSignals crash MSW's Request inside the test environment.
vi.mock("@/features/appointments/appointments-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/appointments/appointments-api")>();
  return {
    ...api,
    getAppointmentsRequest: (
      params: import("@/features/appointments/appointments-api").AppointmentListParams,
    ) => api.getAppointmentsRequest(params),
    getAppointmentRequest: (id: string) => api.getAppointmentRequest(id),
  };
});
vi.mock("@/features/customers/customers-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/customers/customers-api")>();
  return {
    ...api,
    getCustomersRequest: (params: import("@/features/customers/customers-api").CustomersParams) =>
      api.getCustomersRequest(params),
  };
});
vi.mock("@/features/barbers/barbers-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/barbers/barbers-api")>();
  return {
    ...api,
    getBarbersRequest: (params: import("@/features/barbers/barbers-api").BarbersParams) =>
      api.getBarbersRequest(params),
  };
});
vi.mock("@/features/services/services-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/services/services-api")>();
  return {
    ...api,
    getServicesRequest: (params: import("@/features/services/services-api").ServicesParams) =>
      api.getServicesRequest(params),
  };
});

const seed = () =>
  window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));

const currentMonthDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

describe("appointments calendar", () => {
  it("redirects the legacy /app/calendar to the appointments page", async () => {
    seed();
    useAppointmentsFixture([makeAppointment()]);
    renderApp({ initialEntries: ["/app/calendar"] });

    expect(await screen.findByRole("heading", { name: "Turnos", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Calendario" })).toBeInTheDocument();
  });

  it("renders the current month with seeded appointments and navigates months", async () => {
    const user = userEvent.setup();
    seed();
    useAppointmentsFixture([
      makeAppointment({ id: "a1", appointmentDate: currentMonthDate() }),
      makeAppointment({ id: "a2", appointmentDate: "1999-01-01", status: "cancelled" }),
    ]);
    renderApp({ initialEntries: ["/app/appointments"] });

    await user.click(await screen.findByRole("tab", { name: "Calendario" }));

    expect(
      await screen.findByRole("button", {
        name: /ver turno 10:00 ana pérez · corte de cabello/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 turno")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(await screen.findByText("0 turnos")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ver turno 10:00 ana pérez/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(await screen.findByText("1 turno")).toBeInTheDocument();
  });
});
