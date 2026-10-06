import { Badge } from "@/components/ui/badge";
import {
  appointmentStatusLabel,
  appointmentStatusVariant,
} from "@/features/appointments/appointments-status";

/** Statuses are always rendered translated, never with the raw backend value. */
export const AppointmentStatusBadge = ({ status }: { status: string }) => (
  <Badge variant={appointmentStatusVariant(status)}>{appointmentStatusLabel(status)}</Badge>
);
