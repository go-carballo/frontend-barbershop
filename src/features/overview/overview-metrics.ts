import type { Appointment, AppointmentStatus } from "@/features/appointments/appointments-api";

/**
 * Deuda técnica: el backend no expone endpoints de dashboard ni rangos de
 * fechas, y limita `perPage` a 100. El panel pide los 100 turnos más recientes
 * (el endpoint ordena por `appointmentDate DESC`) y agrega en el frontend todas
 * las métricas derivadas. Si en una ventana hay más de 100 turnos, los gráficos
 * se cuentan parcialmente hasta que la API exponga agregaciones o un filtro por
 * rango. Los totales de KPI (clientes, barberos, servicios y turnos de hoy) sí
 * son exactos: el backend devuelve `total` filtrado.
 */
export const DASHBOARD_APPOINTMENTS_FETCH_SIZE = 100;

/** `directory` endpoints cap `perPage` at 100; totals come from `total`. */
export const DASHBOARD_DIRECTORY_FETCH_SIZE = 100;

/** Local business date (`YYYY-MM-DD`), never derived from a UTC timestamp. */
export const localTodayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Next appointments from today onwards, ascending. `appointmentDate` is a
 * business date (`YYYY-MM-DD`), so a plain string comparison is safe and never
 * shifts through UTC.
 */
export const upcomingAppointments = (appointments: Appointment[], todayIso: string, limit = 6) =>
  appointments
    .filter((appointment) => appointment.appointmentDate >= todayIso)
    .sort(
      (a, b) =>
        a.appointmentDate.localeCompare(b.appointmentDate) ||
        a.startTime.localeCompare(b.startTime),
    )
    .slice(0, limit);

/** Most recently updated appointments first (backend returns ISO timestamps). */
export const recentAppointments = (appointments: Appointment[], limit = 3) =>
  [...appointments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);

export type MonthPoint = { key: string; name: string; turnos: number };

const monthLabel = (date: Date) => {
  const label = date.toLocaleDateString("es-AR", { month: "short" });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Turns per month for the last `months` months, chronological and zero-filled.
 * Grouping reads the `YYYY-MM` prefix of `appointmentDate` (no `Date` parsing),
 * so local business dates never shift through UTC.
 */
export const appointmentsByMonth = (appointments: Appointment[], months: number): MonthPoint[] => {
  const counts = new Map<string, number>();
  for (const appointment of appointments) {
    const key = appointment.appointmentDate.slice(0, 7);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const points: MonthPoint[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    points.push({ key, name: monthLabel(date), turnos: counts.get(key) ?? 0 });
  }
  return points;
};

export type ServiceDemandPoint = { name: string; turnos: number };

/** Most requested services, ordered by appointment count. */
export const topServices = (appointments: Appointment[], limit = 6): ServiceDemandPoint[] => {
  const byService = new Map<string, ServiceDemandPoint>();
  for (const appointment of appointments) {
    const entry = byService.get(appointment.serviceId);
    if (entry) {
      entry.turnos += 1;
    } else {
      byService.set(appointment.serviceId, {
        name: appointment.service?.name ?? "Servicio",
        turnos: 1,
      });
    }
  }
  return [...byService.values()].sort((a, b) => b.turnos - a.turnos).slice(0, limit);
};

/** Same palette as the previous donut so the visual combination is preserved. */
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: "#3b82f6",
  confirmed: "#60a5fa",
  completed: "#93c5fd",
  cancelled: "#cbd5e1",
};

const STATUS_DISTRIBUTION_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programados",
  confirmed: "Confirmados",
  completed: "Completados",
  cancelled: "Cancelados",
};

export type StatusShare = { name: string; value: number; color: string };

/** Distribution of appointments across the four backend statuses. */
export const appointmentsByStatus = (appointments: Appointment[]): StatusShare[] => {
  const counts = new Map<AppointmentStatus, number>();
  for (const appointment of appointments) {
    counts.set(appointment.status, (counts.get(appointment.status) ?? 0) + 1);
  }
  return (Object.keys(STATUS_COLORS) as AppointmentStatus[]).map((status) => ({
    name: STATUS_DISTRIBUTION_LABELS[status],
    value: counts.get(status) ?? 0,
    color: STATUS_COLORS[status],
  }));
};

/** `YYYY-MM-DD` → `dd/mm/yyyy`, treating the value as a local business date. */
export const formatBusinessDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });

/** `HH:mm:ss` → `HH:mm`. */
export const formatStartTime = (time: string) => time.slice(0, 5);

/** Long local date, e.g. "viernes, 9 de octubre". */
export const formatLongBusinessDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

/** ISO timestamp → `dd/mm/yyyy HH:mm` in local time (activity feed). */
export const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
