import { HttpResponse, http } from "msw";
import type { Appointment } from "@/features/appointments/appointments-api";
import {
  makeAppointment,
  testBarber,
  testCustomer,
  testService,
} from "@/test/appointments-fixtures";
import { server } from "@/test/server";

/** Business date `days` from today, in local time (mirrors `localTodayIso`). */
const dayOffsetIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const luisCustomer = { ...testCustomer, id: "cust-2", name: "Luis Gómez" };
const mariaCustomer = { ...testCustomer, id: "cust-3", name: "María López" };
const pedroCustomer = { ...testCustomer, id: "cust-4", name: "Pedro Ruiz" };
const beardService = { ...testService, id: "svc-2", name: "Barba y bigote", price: 1500 };

/**
 * A small appointment window covering every status, two services and both past
 * and future days, so the dashboard aggregations have something real to derive.
 */
export const overviewAppointments: Appointment[] = [
  makeAppointment({
    id: "appt-today-confirmed",
    appointmentDate: dayOffsetIso(0),
    startTime: "10:00:00",
    endTime: "10:30:00",
    status: "confirmed",
    updatedAt: "2026-10-08T18:00:00.000Z",
  }),
  makeAppointment({
    id: "appt-today-scheduled",
    customerId: luisCustomer.id,
    customer: luisCustomer,
    serviceId: beardService.id,
    service: beardService,
    appointmentDate: dayOffsetIso(0),
    startTime: "11:00:00",
    endTime: "11:30:00",
    status: "scheduled",
    updatedAt: "2026-10-08T17:00:00.000Z",
  }),
  makeAppointment({
    id: "appt-upcoming",
    customerId: mariaCustomer.id,
    customer: mariaCustomer,
    appointmentDate: dayOffsetIso(3),
    startTime: "16:00:00",
    endTime: "16:30:00",
    status: "scheduled",
    updatedAt: "2026-10-08T16:00:00.000Z",
  }),
  makeAppointment({
    id: "appt-past-completed",
    customerId: pedroCustomer.id,
    customer: pedroCustomer,
    serviceId: beardService.id,
    service: beardService,
    appointmentDate: dayOffsetIso(-2),
    startTime: "12:00:00",
    endTime: "12:30:00",
    status: "completed",
    updatedAt: "2026-10-01T10:00:00.000Z",
  }),
  makeAppointment({
    id: "appt-past-cancelled",
    customerId: pedroCustomer.id,
    customer: pedroCustomer,
    appointmentDate: dayOffsetIso(-10),
    status: "cancelled",
    updatedAt: "2026-09-25T10:00:00.000Z",
  }),
];

/**
 * Backend-shaped handlers for every endpoint the BarberShop dashboard consumes,
 * mirroring the NestJS contracts (`{ data, total, page, perPage }`, the
 * `appointmentDate` filter and hydrated relations).
 */
export const useOverviewFixture = () => {
  server.use(
    http.get("*/appointments", ({ request }) => {
      const query = new URL(request.url).searchParams;
      const page = Number(query.get("page") ?? "1");
      const perPage = Number(query.get("perPage") ?? "10");
      const appointmentDate = query.get("appointmentDate");
      const filtered = appointmentDate
        ? overviewAppointments.filter(
            (appointment) => appointment.appointmentDate === appointmentDate,
          )
        : overviewAppointments;
      return HttpResponse.json({
        data: filtered.slice((page - 1) * perPage, page * perPage),
        total: filtered.length,
        page,
        perPage,
      });
    }),
    http.get("*/customers", () =>
      HttpResponse.json({ data: [testCustomer], total: 24, page: 1, perPage: 100 }),
    ),
    http.get("*/barbers", () =>
      HttpResponse.json({ data: [testBarber], total: 3, page: 1, perPage: 100 }),
    ),
    http.get("*/services", () =>
      HttpResponse.json({ data: [testService], total: 5, page: 1, perPage: 100 }),
    ),
  );
};
