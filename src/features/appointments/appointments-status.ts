import type { AppointmentStatus } from "@/features/appointments/appointments-api";
import { APPOINTMENT_STATUSES } from "@/features/appointments/appointments-api";
import type { CalendarTone } from "@/types";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Programado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<AppointmentStatus, "outline" | "default" | "success" | "warning"> = {
  scheduled: "outline",
  confirmed: "default",
  completed: "success",
  cancelled: "warning",
};

/** One tone per status so the calendar chips are distinguishable at a glance. */
const STATUS_TONES: Record<AppointmentStatus, CalendarTone> = {
  scheduled: "accent",
  confirmed: "neutral",
  completed: "success",
  cancelled: "warning",
};

const isAppointmentStatus = (value: string): value is AppointmentStatus =>
  (APPOINTMENT_STATUSES as readonly string[]).includes(value);

export const appointmentStatusLabel = (status: string): string =>
  isAppointmentStatus(status) ? STATUS_LABELS[status] : status;

export const appointmentStatusVariant = (
  status: string,
): "outline" | "default" | "success" | "warning" =>
  isAppointmentStatus(status) ? STATUS_VARIANTS[status] : "outline";

export const appointmentTone = (status: string): CalendarTone =>
  isAppointmentStatus(status) ? STATUS_TONES[status] : "accent";
