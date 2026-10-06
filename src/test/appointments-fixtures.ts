import { HttpResponse, http } from "msw";
import type { Appointment } from "@/features/appointments/appointments-api";
import { server } from "@/test/server";

export const testCustomer = {
  id: "cust-1",
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "555-0100",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const testBarber = {
  id: "barber-1",
  name: "Bruno Cortés",
  email: null,
  phone: null,
  specialty: "Fade",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const testService = {
  id: "svc-1",
  name: "Corte de cabello",
  description: null,
  durationMinutes: 30,
  price: 2500,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: "appt-1",
  customerId: testCustomer.id,
  barberId: testBarber.id,
  serviceId: testService.id,
  appointmentDate: "2026-10-06",
  startTime: "10:00:00",
  endTime: "10:30:00",
  status: "scheduled",
  notes: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  customer: testCustomer,
  barber: testBarber,
  service: testService,
  ...overrides,
});

export type AppointmentsFixtureState = {
  appointments: Appointment[];
  creates: Record<string, unknown>[];
  patches: { id: string; input: Record<string, unknown> }[];
  deletes: string[];
  listQueries: URLSearchParams[];
  /** When set, `POST /appointments` rejects with this body (e.g. the 409 conflict). */
  rejectCreateWith?: { status: number; message: string };
};

/**
 * Registers MSW handlers that mirror the real NestJS module: server-side
 * pagination, the exact `ListAppointmentsQueryDto` filters, hydrated relations
 * on list/detail, and 409/404 responses.
 */
export const useAppointmentsFixture = (initial: Appointment[] = []) => {
  const state: AppointmentsFixtureState = {
    appointments: [...initial],
    creates: [],
    patches: [],
    deletes: [],
    listQueries: [],
  };

  // Active pickers: every customer referenced by the seeded appointments, so
  // the customer filter/form can actually select them (deduped by id).
  const customers = Array.from(
    new Map(
      initial
        .map((appointment) => appointment.customer)
        .filter((customer): customer is NonNullable<typeof customer> => Boolean(customer))
        .map((customer) => [customer.id, customer]),
    ).values(),
  );
  const pickerCustomers = customers.length > 0 ? customers : [testCustomer];

  server.use(
    http.get("*/appointments", ({ request }) => {
      const query = new URL(request.url).searchParams;
      state.listQueries.push(query);
      const page = Number(query.get("page") ?? "1");
      const perPage = Number(query.get("perPage") ?? "10");
      const status = query.get("status");
      const customerId = query.get("customerId");
      const barberId = query.get("barberId");
      const serviceId = query.get("serviceId");
      const appointmentDate = query.get("appointmentDate");
      const filtered = state.appointments.filter((appointment) => {
        if (status && appointment.status !== status) return false;
        if (customerId && appointment.customerId !== customerId) return false;
        if (barberId && appointment.barberId !== barberId) return false;
        if (serviceId && appointment.serviceId !== serviceId) return false;
        if (appointmentDate && appointment.appointmentDate !== appointmentDate) return false;
        return true;
      });
      return HttpResponse.json({
        data: filtered.slice((page - 1) * perPage, page * perPage),
        total: filtered.length,
        page,
        perPage,
      });
    }),
    http.get("*/appointments/:id", ({ params }) => {
      const { id } = params as { id: string };
      const appointment = state.appointments.find((item) => item.id === id);
      if (!appointment) {
        return HttpResponse.json({ message: "Appointment not found." }, { status: 404 });
      }
      return HttpResponse.json(appointment);
    }),
    http.post("*/appointments", async ({ request }) => {
      if (state.rejectCreateWith) {
        return HttpResponse.json(
          { message: state.rejectCreateWith.message },
          { status: state.rejectCreateWith.status },
        );
      }
      const input = (await request.json()) as Record<string, unknown>;
      state.creates.push(input);
      // Mirrors the real `POST` response: foreign keys are present, relations are not.
      const appointment: Appointment = {
        id: "appt-new",
        customerId: String(input.customerId),
        barberId: String(input.barberId),
        serviceId: String(input.serviceId),
        appointmentDate: String(input.appointmentDate),
        startTime: String(input.startTime),
        endTime: String(input.endTime),
        status: (input.status as Appointment["status"]) ?? "scheduled",
        notes: (input.notes as string | null) ?? null,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      };
      state.appointments.unshift(appointment);
      return HttpResponse.json(
        { ...appointment, customer: testCustomer, barber: testBarber, service: testService },
        { status: 201 },
      );
    }),
    http.patch("*/appointments/:id", async ({ params, request }) => {
      const { id } = params as { id: string };
      const input = (await request.json()) as Record<string, unknown>;
      state.patches.push({ id, input });
      const index = state.appointments.findIndex((item) => item.id === id);
      if (index === -1) {
        return HttpResponse.json({ message: "Appointment not found." }, { status: 404 });
      }
      state.appointments[index] = { ...state.appointments[index], ...input };
      return HttpResponse.json(state.appointments[index]);
    }),
    http.delete("*/appointments/:id", ({ params }) => {
      const { id } = params as { id: string };
      state.deletes.push(id);
      state.appointments = state.appointments.filter((item) => item.id !== id);
      return new HttpResponse(null, { status: 200 });
    }),
    // Pickers for the filters and the create/edit form.
    http.get("*/customers", () =>
      HttpResponse.json({
        data: pickerCustomers,
        total: pickerCustomers.length,
        page: 1,
        perPage: 100,
      }),
    ),
    http.get("*/barbers", () =>
      HttpResponse.json({ data: [testBarber], total: 1, page: 1, perPage: 100 }),
    ),
    http.get("*/services", () =>
      HttpResponse.json({ data: [testService], total: 1, page: 1, perPage: 100 }),
    ),
  );

  return state;
};
