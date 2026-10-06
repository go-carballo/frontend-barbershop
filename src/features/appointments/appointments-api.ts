import type { Barber } from "@/features/barbers/barbers-api";
import type { Customer } from "@/features/customers/customers-api";
import type { Service } from "@/features/services/services-api";
import { http } from "@/lib/http";
import type { AppRole } from "@/types";

export const APPOINTMENT_STATUSES = ["scheduled", "confirmed", "completed", "cancelled"] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * Shape returned by `GET /appointments`, `GET /appointments/:id`, `POST` and
 * `PATCH`. List/detail responses hydrate the relations with `leftJoinAndSelect`;
 * `POST` only guarantees the foreign keys, hence the relations are optional and
 * the UI always falls back to the raw ids.
 */
export type Appointment = {
  id: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  /** `YYYY-MM-DD`, exactly what `ListAppointmentsQueryDto.appointmentDate` filters on. */
  appointmentDate: string;
  /** `HH:mm:ss`, the format enforced by `CreateAppointmentDto`. */
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  barber?: Barber;
  service?: Service;
};

export type AppointmentListParams = {
  page: number;
  perPage: number;
  customerId?: string;
  barberId?: string;
  serviceId?: string;
  appointmentDate?: string;
  status?: AppointmentStatus;
};

export type AppointmentsResponse = {
  data: Appointment[];
  total: number;
  page: number;
  perPage: number;
};

export type CreateAppointmentInput = {
  customerId: string;
  barberId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  notes?: string | null;
};

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>;

/**
 * The backend has no `from`/`to` range filter, so the calendar asks for the
 * newest `perPage=100` appointments (the endpoint orders by date DESC) and
 * filters the visible month client-side. Known debt: a month with more than
 * 100 appointments, or a month preceded by more than 100 newer ones, will be
 * shown incomplete until the API exposes a date range filter.
 */
export const CALENDAR_FETCH_SIZE = 100;

export const appointmentsKeys = {
  all: ["appointments"] as const,
  list: (params: AppointmentListParams, userId: string) =>
    ["appointments", "list", userId, params] as const,
  calendar: (userId: string) => ["appointments", "calendar", userId] as const,
  detail: (id: string | null) => ["appointments", "detail", id] as const,
};

export const getAppointmentsRequest = (params: AppointmentListParams, signal?: AbortSignal) => {
  const query = new URLSearchParams({ page: String(params.page), perPage: String(params.perPage) });
  if (params.customerId) query.set("customerId", params.customerId);
  if (params.barberId) query.set("barberId", params.barberId);
  if (params.serviceId) query.set("serviceId", params.serviceId);
  if (params.appointmentDate) query.set("appointmentDate", params.appointmentDate);
  if (params.status) query.set("status", params.status);
  return http<AppointmentsResponse>(`/appointments?${query}`, { signal });
};

export const getAppointmentRequest = (id: string, signal?: AbortSignal) =>
  http<Appointment>(`/appointments/${encodeURIComponent(id)}`, { signal });

export const createAppointmentRequest = (input: CreateAppointmentInput) =>
  http<Appointment>("/appointments", { method: "POST", body: JSON.stringify(input) });

export const updateAppointmentRequest = (id: string, input: UpdateAppointmentInput) =>
  http<Appointment>(`/appointments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteAppointmentRequest = (id: string) =>
  http<void>(`/appointments/${encodeURIComponent(id)}`, { method: "DELETE" });

/** Raw `role` claim of the JWT (`admin` | `receptionist` | `barber`). */
const readBackendRole = (token?: string): string | null => {
  const segment = token?.split(".")[1];
  if (!segment) return null;
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as {
      role?: unknown;
    };
    return typeof claims.role === "string" ? claims.role.toLowerCase() : null;
  } catch {
    return null;
  }
};

/**
 * Backend rules: ADMIN, RECEPTIONIST and BARBER can read and create appointments.
 * Tokens issued by NestJS carry the real claim, so it wins; sessions that predate
 * the backend (template/demo tokens, which are not decodable) fall back to the
 * normalized UI role so the demo keeps working.
 */
export const canCreateAppointment = (token?: string, uiRole?: AppRole): boolean => {
  const role = readBackendRole(token);
  if (role) return role === "admin" || role === "receptionist" || role === "barber";
  return uiRole === "Owner" || uiRole === "Admin" || uiRole === "Manager";
};

/**
 * Backend rules: only ADMIN and RECEPTIONIST can update or delete appointments.
 */
export const canManageAppointment = (token?: string, uiRole?: AppRole): boolean => {
  const role = readBackendRole(token);
  if (role) return role === "admin" || role === "receptionist";
  return uiRole === "Owner" || uiRole === "Admin";
};
