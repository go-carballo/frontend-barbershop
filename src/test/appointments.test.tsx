import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { defaultSession } from "@/mocks/data";
import {
  makeAppointment,
  testBarber,
  testCustomer,
  testService,
  useAppointmentsFixture,
} from "@/test/appointments-fixtures";
import { server } from "@/test/server";
import { renderApp } from "@/test/test-app";
import type { Session } from "@/types";

// jsdom signals belong to a different realm than Node fetch, so React Query
// AbortSignals crash MSW's Request inside the test environment. Drop them like
// the customers page tests do (see customers-page.test.tsx).
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

/** JWT-shaped token carrying the backend `admin` role (can edit/delete). */
const adminSession: Session = {
  ...defaultSession,
  accessToken: `header.${btoa(JSON.stringify({ role: "admin" }))}.signature`,
};

const seed = (session: Session = adminSession) =>
  window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(session));

describe("appointments module", () => {
  it("renders the appointment list and filters by status, customer, service and date", async () => {
    const user = userEvent.setup();
    seed();
    const state = useAppointmentsFixture([
      makeAppointment({ id: "a1", status: "scheduled" }),
      makeAppointment({
        id: "a2",
        status: "completed",
        customer: { ...testCustomer, id: "cust-2", name: "Bea Gómez" },
        customerId: "cust-2",
      }),
      makeAppointment({
        id: "a3",
        status: "cancelled",
        customer: { ...testCustomer, id: "cust-3", name: "Carolina Ruiz" },
        customerId: "cust-3",
        appointmentDate: "2026-10-07",
      }),
    ]);
    renderApp({ initialEntries: ["/app/appointments"] });

    // The table renders every appointment; statuses are translated, never raw.
    // Scoped to the table: the filter dropdowns also list customers and statuses.
    const table = await screen.findByRole("table");
    const appointmentsTable = () => within(table);
    expect(await appointmentsTable().findByText("Ana Pérez")).toBeInTheDocument();
    expect(appointmentsTable().getByText("Bea Gómez")).toBeInTheDocument();
    expect(appointmentsTable().getByText("Carolina Ruiz")).toBeInTheDocument();
    expect(appointmentsTable().getByText("Programado")).toBeInTheDocument();
    expect(appointmentsTable().getByText("Completado")).toBeInTheDocument();
    expect(appointmentsTable().getByText("Cancelado")).toBeInTheDocument();
    expect(screen.getByText("3 turnos")).toBeInTheDocument();

    // Status filter goes straight to the server.
    await user.selectOptions(screen.getByLabelText("Estado"), "completed");
    await waitFor(() => expect(state.listQueries.at(-1)?.get("status")).toBe("completed"));
    // The table node is remounted while refetching, so re-resolve it on every
    // assertion instead of reusing the (now detached) first node.
    await waitFor(() =>
      expect(within(screen.getByRole("table")).getByText("Bea Gómez")).toBeInTheDocument(),
    );
    expect(within(screen.getByRole("table")).queryByText("Ana Pérez")).not.toBeInTheDocument();
    expect(screen.getByText("1 turno")).toBeInTheDocument();

    // A fresh start for the next filter: filters combine, so clear first.
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(screen.getByText("3 turnos")).toBeInTheDocument());

    // Customer filter.
    await user.selectOptions(screen.getByLabelText("Cliente"), "cust-3");
    await waitFor(() => expect(state.listQueries.at(-1)?.get("customerId")).toBe("cust-3"));
    await waitFor(() =>
      expect(within(screen.getByRole("table")).getByText("Carolina Ruiz")).toBeInTheDocument(),
    );
    expect(within(screen.getByRole("table")).queryByText("Ana Pérez")).not.toBeInTheDocument();
    expect(screen.getByText("1 turno")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(screen.getByText("3 turnos")).toBeInTheDocument());

    // Date filter uses the exact `appointmentDate` backend supports. Only a3
    // (cancelled) lands on 2026-10-07.
    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "2026-10-07" },
    });
    await waitFor(() =>
      expect(state.listQueries.at(-1)?.get("appointmentDate")).toBe("2026-10-07"),
    );
    await waitFor(() =>
      expect(within(screen.getByRole("table")).getByText("Carolina Ruiz")).toBeInTheDocument(),
    );
    expect(within(screen.getByRole("table")).queryByText("Ana Pérez")).not.toBeInTheDocument();
    expect(screen.getByText("1 turno")).toBeInTheDocument();

    // Clearing the filters restores the full set.
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    await waitFor(() => expect(screen.getByText("3 turnos")).toBeInTheDocument());
    expect(within(screen.getByRole("table")).getByText("Bea Gómez")).toBeInTheDocument();
  });

  it("paginates with the server page count", async () => {
    const user = userEvent.setup();
    seed();
    const state = useAppointmentsFixture(
      Array.from({ length: 11 }, (_, index) =>
        makeAppointment({
          id: `appt-${index}`,
          appointmentDate: `2026-10-${String((index % 28) + 1).padStart(2, "0")}`,
        }),
      ),
    );
    renderApp({ initialEntries: ["/app/appointments"] });

    // Pagination comes from the server page count; every seeded row shares a name.
    await screen.findByText("Página 1 de 2");
    expect(state.listQueries.at(-1)?.get("perPage")).toBe("10");

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await waitFor(() => expect(state.listQueries.at(-1)?.get("page")).toBe("2"));
    expect(screen.getByText("Página 2 de 2")).toBeInTheDocument();
  });

  it("creates an appointment computing the end time from the service duration", async () => {
    const user = userEvent.setup();
    seed();
    const state = useAppointmentsFixture();
    renderApp({ initialEntries: ["/app/appointments"] });

    await user.click(await screen.findByRole("button", { name: "Nuevo turno" }));
    // The create dialog overlaps the list page, so queries are scoped to the dialog:
    // the filters behind also expose Cliente/Barbero/Servicio/Fecha labels.
    const dialog = () => within(screen.getByRole("dialog"));
    // Wait until the pickers are hydrated by the real Customers/Barbers/Services APIs.
    await dialog().findByRole("option", { name: "Ana Pérez" });

    await user.selectOptions(dialog().getByLabelText("Cliente"), "cust-1");
    await user.selectOptions(dialog().getByLabelText("Barbero"), "barber-1");
    await user.selectOptions(dialog().getByLabelText("Servicio"), "svc-1");
    fireEvent.change(dialog().getByLabelText("Fecha"), { target: { value: "2026-10-08" } });
    fireEvent.change(dialog().getByLabelText("Hora de inicio"), { target: { value: "10:00" } });

    // durationMinutes = 30 => end time auto-fills with 10:30, editable afterwards.
    await waitFor(() =>
      expect(dialog().getByLabelText("Hora de finalización")).toHaveValue("10:30"),
    );

    await user.type(dialog().getByLabelText("Notas (opcional)"), "Corte degradé");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(state.creates).toHaveLength(1));
    expect(state.creates[0]).toEqual({
      customerId: "cust-1",
      barberId: "barber-1",
      serviceId: "svc-1",
      appointmentDate: "2026-10-08",
      startTime: "10:00:00",
      endTime: "10:30:00",
      status: "scheduled",
      notes: "Corte degradé",
    });
    expect(await screen.findByText("Turno guardado.")).toBeInTheDocument();
  });

  it("edits an appointment from its detail drawer", async () => {
    const user = userEvent.setup();
    seed();
    const state = useAppointmentsFixture([makeAppointment({ id: "a1" })]);
    renderApp({ initialEntries: ["/app/appointments"] });

    await user.click(await screen.findByRole("row", { name: /ver turno de ana pérez/i }));
    expect(await screen.findByText("Detalle del turno")).toBeInTheDocument();
    expect(screen.getByText("2.500")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Editar" }));
    const notes = await screen.findByLabelText("Notas (opcional)");
    await user.type(notes, "con barba");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(state.patches).toHaveLength(1));
    expect(state.patches[0]).toEqual({ id: "a1", input: expect.any(Object) });
    expect(state.patches[0].input.notes).toBe("con barba");
    expect(await screen.findByText("Turno guardado.")).toBeInTheDocument();
  });

  it("changes the appointment status from the detail drawer", async () => {
    const user = userEvent.setup();
    seed();
    const state = useAppointmentsFixture([makeAppointment({ id: "a1" })]);
    renderApp({ initialEntries: ["/app/appointments"] });

    await user.click(await screen.findByRole("row", { name: /ver turno de ana pérez/i }));
    await screen.findByText("Detalle del turno");

    // Scoped to the drawer: the status filter on the page shares the label.
    const drawer = () => within(screen.getByRole("dialog"));
    await user.selectOptions(drawer().getByLabelText("Estado"), "completed");
    await user.click(screen.getByRole("button", { name: "Cambiar" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Confirmar" }),
    );

    await waitFor(() => expect(state.patches).toHaveLength(1));
    expect(state.patches[0].input).toEqual({ status: "completed" });
    // The badge and the status select both update; the select value is the
    // precise proof that the new status was persisted and refetched.
    await waitFor(() => expect(drawer().getByLabelText("Estado")).toHaveValue("completed"));
  });

  it("deletes an appointment after confirming", async () => {
    const user = userEvent.setup();
    seed();
    const state = useAppointmentsFixture([makeAppointment({ id: "a1" })]);
    renderApp({ initialEntries: ["/app/appointments"] });

    await user.click(await screen.findByRole("row", { name: /ver turno de ana pérez/i }));
    await screen.findByText("Detalle del turno");
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }),
    );

    await waitFor(() => expect(state.deletes).toEqual(["a1"]));
    expect(await screen.findByText("Turno eliminado.")).toBeInTheDocument();
    expect(screen.getByText("No se encontraron turnos")).toBeInTheDocument();
  });

  it("surfaces the backend 409 overlap message when creating", async () => {
    const user = userEvent.setup();
    seed();
    const state = useAppointmentsFixture();
    state.rejectCreateWith = {
      status: 409,
      message: "Appointment overlaps with another appointment for this barber.",
    };
    renderApp({ initialEntries: ["/app/appointments"] });

    await user.click(await screen.findByRole("button", { name: "Nuevo turno" }));
    const dialog = () => within(screen.getByRole("dialog"));
    await dialog().findByRole("option", { name: "Ana Pérez" });

    await user.selectOptions(dialog().getByLabelText("Cliente"), "cust-1");
    await user.selectOptions(dialog().getByLabelText("Barbero"), "barber-1");
    await user.selectOptions(dialog().getByLabelText("Servicio"), "svc-1");
    fireEvent.change(dialog().getByLabelText("Fecha"), { target: { value: "2026-10-08" } });
    fireEvent.change(dialog().getByLabelText("Hora de inicio"), { target: { value: "10:00" } });
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    // The real backend message reaches the toast verbatim instead of a generic copy.
    expect(
      await screen.findByText(/overlaps with another appointment for this barber/i),
    ).toBeInTheDocument();
  });

  it("renders the calendar with appointment chips, opens detail and starts creation from a day", async () => {
    const user = userEvent.setup();
    seed();
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;
    useAppointmentsFixture([
      makeAppointment({ id: "a1", appointmentDate: isoDate }),
      makeAppointment({ id: "a2", appointmentDate: "1999-01-01", status: "cancelled" }),
    ]);
    renderApp({ initialEntries: ["/app/appointments"] });

    await user.click(await screen.findByRole("tab", { name: "Calendario" }));

    // Only the visible month is rendered; out-of-month records are filtered client-side.
    const chip = await screen.findByRole("button", {
      name: /ver turno 10:00 ana pérez · corte de cabello/i,
    });
    expect(screen.getAllByRole("button", { name: /ver turno/i })).toHaveLength(1);

    // Clicking a chip opens the detail drawer.
    await user.click(chip);
    expect(await screen.findByText("Detalle del turno")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    // Clicking a day starts creation pre-filled with that date.
    await user.click(screen.getByRole("button", { name: `Nuevo turno el ${today.getDate()}` }));
    expect(await screen.findByRole("heading", { name: "Crear turno" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toHaveValue(isoDate);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
  });
});

describe("appointments permissions", () => {
  it("hides edit/delete/status actions for barber-only sessions", async () => {
    seed({
      ...defaultSession,
      accessToken: `header.${btoa(JSON.stringify({ role: "barber" }))}.signature`,
    });
    useAppointmentsFixture([makeAppointment({ id: "a1" })]);
    renderApp({ initialEntries: ["/app/appointments"] });

    // Scoped to the table: the customer filter dropdown also lists the name.
    const table = await screen.findByRole("table");
    await within(table).findByText("Ana Pérez");
    // A barber reads and creates, but cannot edit, delete or change status.
    expect(screen.getByRole("button", { name: "Nuevo turno" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("row", { name: /ver turno de ana pérez/i }));
    expect(await screen.findByText(/tu rol permite consultar los turnos/i)).toBeInTheDocument();
  });
});

describe("appointments hybrid mode", () => {
  it("keeps the calendar demo handler registered for the mock layer", async () => {
    // The demo `/api/calendar` handler must still be present: appointments go to
    // the real backend through REAL_API_ROUTES, but the template mocks stay.
    server.use(http.get("/api/calendar", () => HttpResponse.json([])));
    const response = await fetch("/api/calendar?month=2026-10");
    expect(response.status).toBe(200);
  });
});
