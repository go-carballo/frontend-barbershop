import { HttpError } from "@/lib/http";

/**
 * NestJS describes the real problem: a 409 carries the overlap message from
 * `checkConflict` (or the inactive-resource / time-range message) and a 400
 * carries the validation detail. Those messages are surfaced verbatim so the
 * user learns *why* the appointment was rejected.
 */
export const appointmentErrorMessage = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.status === 401) return "La sesión expiró. Vuelve a iniciar sesión.";
    if (error.status === 403) return "No tienes permisos para realizar esta acción.";
    if (error.status === 404) return "No se encontró el turno.";
    if ((error.status === 409 || error.status === 400) && error.detail) return error.detail;
  }
  return "No se pudo completar la operación. Intenta nuevamente.";
};
