import { HttpError } from "@/lib/http";

export const customerErrorMessage = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.status === 401) return "La sesión expiró. Vuelve a iniciar sesión.";
    if (error.status === 403) return "No tienes permisos para realizar esta acción.";
    if (error.status === 404) return "No se encontró el cliente.";
    if (error.status === 409)
      return error.message.includes("appointment")
        ? "No se puede eliminar el cliente porque tiene turnos asociados."
        : "Los datos del cliente entran en conflicto con otro registro.";
    if (error.status === 400) return "Revisa los datos ingresados y vuelve a intentar.";
  }
  return "No se pudo completar la operación. Intenta nuevamente.";
};
