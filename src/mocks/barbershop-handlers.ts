import { HttpResponse, http } from "msw";
import type { Appointment } from "@/features/appointments/appointments-api";
import type { Barber } from "@/features/barbers/barbers-api";
import type { Customer } from "@/features/customers/customers-api";
import type { Service } from "@/features/services/services-api";

/**
 * Demo stand-ins for the real BarberShop endpoints, used only in pure-mock mode
 * (no `VITE_API_BASE_URL`): tests and the standalone demo. Every path here is
 * listed in `REAL_API_ROUTES`, so with a backend configured the requests are
 * prefixed with the API base URL and `mocks/browser.ts` hands them to NestJS
 * untouched — these handlers can never shadow the real API.
 *
 * They mirror the NestJS contracts: `{ data, total, page, perPage }`, hydrated
 * `customer`/`barber`/`service` relations on appointments, and the supported
 * filters (`isActive`, `appointmentDate`).
 */

const dayOffsetIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const demoCustomers: Customer[] = [
  {
    id: "demo-cust-1",
    name: "Ana Pérez",
    email: "ana@example.com",
    phone: "555-0101",
    isActive: true,
    createdAt: "2026-01-05T10:00:00.000Z",
    updatedAt: "2026-01-05T10:00:00.000Z",
  },
  {
    id: "demo-cust-2",
    name: "Luis Gómez",
    email: "luis@example.com",
    phone: "555-0102",
    isActive: true,
    createdAt: "2026-02-10T10:00:00.000Z",
    updatedAt: "2026-02-10T10:00:00.000Z",
  },
  {
    id: "demo-cust-3",
    name: "María López",
    email: "maria@example.com",
    phone: null,
    isActive: true,
    createdAt: "2026-03-15T10:00:00.000Z",
    updatedAt: "2026-03-15T10:00:00.000Z",
  },
];

const demoBarbers: Barber[] = [
  {
    id: "demo-barber-1",
    name: "Bruno Cortés",
    email: "bruno@barbershop.com",
    phone: null,
    specialty: "Fade",
    isActive: true,
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
  },
  {
    id: "demo-barber-2",
    name: "Diego Navarro",
    email: "diego@barbershop.com",
    phone: null,
    specialty: "Barbas",
    isActive: true,
    createdAt: "2026-01-03T10:00:00.000Z",
    updatedAt: "2026-01-03T10:00:00.000Z",
  },
];

const demoServices: Service[] = [
  {
    id: "demo-svc-1",
    name: "Corte de cabello",
    description: "Corte clásico con tijera y máquina.",
    durationMinutes: 30,
    price: 4500,
    isActive: true,
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
  },
  {
    id: "demo-svc-2",
    name: "Barba y bigote",
    description: "Perfilado y arreglo de barba.",
    durationMinutes: 20,
    price: 3000,
    isActive: true,
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
  },
  {
    id: "demo-svc-3",
    name: "Corte + barba",
    description: "Combo de corte y arreglo de barba.",
    durationMinutes: 45,
    price: 6500,
    isActive: true,
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
  },
];

const demoAppointments: Appointment[] = [
  {
    id: "demo-appt-1",
    customerId: demoCustomers[0].id,
    barberId: demoBarbers[0].id,
    serviceId: demoServices[0].id,
    appointmentDate: dayOffsetIso(0),
    startTime: "10:00:00",
    endTime: "10:30:00",
    status: "confirmed",
    notes: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-08T10:00:00.000Z",
    customer: demoCustomers[0],
    barber: demoBarbers[0],
    service: demoServices[0],
  },
  {
    id: "demo-appt-2",
    customerId: demoCustomers[1].id,
    barberId: demoBarbers[1].id,
    serviceId: demoServices[1].id,
    appointmentDate: dayOffsetIso(0),
    startTime: "11:30:00",
    endTime: "11:50:00",
    status: "scheduled",
    notes: null,
    createdAt: "2026-10-02T10:00:00.000Z",
    updatedAt: "2026-10-07T10:00:00.000Z",
    customer: demoCustomers[1],
    barber: demoBarbers[1],
    service: demoServices[1],
  },
  {
    id: "demo-appt-3",
    customerId: demoCustomers[2].id,
    barberId: demoBarbers[0].id,
    serviceId: demoServices[2].id,
    appointmentDate: dayOffsetIso(1),
    startTime: "16:00:00",
    endTime: "16:45:00",
    status: "scheduled",
    notes: null,
    createdAt: "2026-10-03T10:00:00.000Z",
    updatedAt: "2026-10-06T10:00:00.000Z",
    customer: demoCustomers[2],
    barber: demoBarbers[0],
    service: demoServices[2],
  },
  {
    id: "demo-appt-4",
    customerId: demoCustomers[0].id,
    barberId: demoBarbers[1].id,
    serviceId: demoServices[0].id,
    appointmentDate: dayOffsetIso(3),
    startTime: "12:00:00",
    endTime: "12:30:00",
    status: "scheduled",
    notes: null,
    createdAt: "2026-10-04T10:00:00.000Z",
    updatedAt: "2026-10-05T10:00:00.000Z",
    customer: demoCustomers[0],
    barber: demoBarbers[1],
    service: demoServices[0],
  },
  {
    id: "demo-appt-5",
    customerId: demoCustomers[1].id,
    barberId: demoBarbers[0].id,
    serviceId: demoServices[2].id,
    appointmentDate: dayOffsetIso(-2),
    startTime: "15:00:00",
    endTime: "15:45:00",
    status: "completed",
    notes: null,
    createdAt: "2026-09-28T10:00:00.000Z",
    updatedAt: "2026-09-30T10:00:00.000Z",
    customer: demoCustomers[1],
    barber: demoBarbers[0],
    service: demoServices[2],
  },
  {
    id: "demo-appt-6",
    customerId: demoCustomers[2].id,
    barberId: demoBarbers[1].id,
    serviceId: demoServices[1].id,
    appointmentDate: dayOffsetIso(-9),
    startTime: "17:00:00",
    endTime: "17:20:00",
    status: "cancelled",
    notes: null,
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
    customer: demoCustomers[2],
    barber: demoBarbers[1],
    service: demoServices[1],
  },
];

const readParam = (request: Request, key: string) => new URL(request.url).searchParams.get(key);

const paginate = <T>(rows: T[], request: Request) => {
  const page = Number(readParam(request, "page") ?? "1");
  const perPage = Number(readParam(request, "perPage") ?? "10");
  return {
    data: rows.slice((page - 1) * perPage, page * perPage),
    total: rows.length,
    page,
    perPage,
  };
};

export const barbershopDemoHandlers = [
  http.get("*/customers", ({ request }) => {
    const search = readParam(request, "search")?.toLowerCase();
    const isActive = readParam(request, "isActive");
    const rows = demoCustomers.filter((customer) => {
      if (isActive === "true" && !customer.isActive) return false;
      if (isActive === "false" && customer.isActive) return false;
      if (!search) return true;
      return `${customer.name} ${customer.email ?? ""} ${customer.phone ?? ""}`
        .toLowerCase()
        .includes(search);
    });
    return HttpResponse.json(paginate(rows, request));
  }),
  http.get("*/barbers", ({ request }) => {
    const isActive = readParam(request, "isActive");
    const rows = demoBarbers.filter((barber) => {
      if (isActive === "true" && !barber.isActive) return false;
      if (isActive === "false" && barber.isActive) return false;
      return true;
    });
    return HttpResponse.json(paginate(rows, request));
  }),
  http.get("*/services", ({ request }) => {
    const isActive = readParam(request, "isActive");
    const rows = demoServices.filter((service) => {
      if (isActive === "true" && !service.isActive) return false;
      if (isActive === "false" && service.isActive) return false;
      return true;
    });
    return HttpResponse.json(paginate(rows, request));
  }),
  http.get("*/appointments", ({ request }) => {
    const appointmentDate = readParam(request, "appointmentDate");
    const status = readParam(request, "status");
    const barberId = readParam(request, "barberId");
    const customerId = readParam(request, "customerId");
    const serviceId = readParam(request, "serviceId");
    const rows = demoAppointments
      .filter((appointment) => {
        if (appointmentDate && appointment.appointmentDate !== appointmentDate) return false;
        if (status && appointment.status !== status) return false;
        if (barberId && appointment.barberId !== barberId) return false;
        if (customerId && appointment.customerId !== customerId) return false;
        if (serviceId && appointment.serviceId !== serviceId) return false;
        return true;
      })
      .sort(
        (a, b) =>
          b.appointmentDate.localeCompare(a.appointmentDate) ||
          b.startTime.localeCompare(a.startTime),
      );
    return HttpResponse.json(paginate(rows, request));
  }),
];
