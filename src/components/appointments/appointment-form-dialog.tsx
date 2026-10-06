import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, type SelectHTMLAttributes, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppointmentOptions } from "@/features/appointments/appointment-options";
import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type CreateAppointmentInput,
} from "@/features/appointments/appointments-api";
import { appointmentStatusLabel } from "@/features/appointments/appointments-status";

/** NestJS requires `HH:mm:ss`; the `<input type="time">` widgets speak `HH:MM`. */
const toTimeInput = (value: string) => value.slice(0, 5);
const toTimeStorage = (value: string) => (value.length === 5 ? `${value}:00` : value);

/** `HH:MM` (+ minutes) clamped to the last minute of the day. */
const addMinutes = (time: string, minutes: number) => {
  const [hours = 0, mins = 0] = time.split(":").map(Number);
  const total = Math.min(hours * 60 + mins + minutes, 24 * 60 - 1);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export const appointmentSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente."),
  barberId: z.string().min(1, "Selecciona un barbero."),
  serviceId: z.string().min(1, "Selecciona un servicio."),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona una fecha."),
  startTime: z.string().regex(TIME_PATTERN, "Indica la hora de inicio (HH:MM)."),
  endTime: z.string().regex(TIME_PATTERN, "Indica la hora de finalización (HH:MM)."),
  status: z.enum(APPOINTMENT_STATUSES),
  notes: z.string().max(500, "Máximo 500 caracteres."),
});

type Values = z.infer<typeof appointmentSchema>;

const selectClass =
  "flex h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50";

type SelectFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
} & SelectHTMLAttributes<HTMLSelectElement>;

const SelectField = ({ id, label, error, children, ...props }: SelectFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <select
      id={id}
      className={selectClass}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      {...props}
    >
      {children}
    </select>
    {error ? (
      <p id={`${id}-error`} role="alert" className="text-sm text-[var(--danger)]">
        {error}
      </p>
    ) : null}
  </div>
);

type AppointmentFormDialogProps = {
  appointment: Appointment | null;
  /** Pre-fills the date when the form is opened from a calendar day. */
  defaultDate?: string;
  options?: AppointmentOptions;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
};

export function AppointmentFormDialog({
  appointment,
  defaultDate,
  options,
  pending,
  onClose,
  onSubmit,
}: AppointmentFormDialogProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(appointmentSchema),
    mode: "onBlur",
    defaultValues: {
      customerId: appointment?.customerId ?? "",
      barberId: appointment?.barberId ?? "",
      serviceId: appointment?.serviceId ?? "",
      appointmentDate: appointment?.appointmentDate ?? defaultDate ?? "",
      startTime: appointment ? toTimeInput(appointment.startTime) : "",
      endTime: appointment ? toTimeInput(appointment.endTime) : "",
      status: appointment?.status ?? "scheduled",
      notes: appointment?.notes ?? "",
    },
  });

  const watchedServiceId = watch("serviceId");
  const watchedStartTime = watch("startTime");
  const skipAutoEnd = useRef(true);

  // `endTime` follows `Service.durationMinutes` whenever the service or the start
  // time changes. The first run only settles the initial values (an appointment
  // being edited keeps its stored end time) and a manual edit survives until the
  // next change of service or start time.
  useEffect(() => {
    if (skipAutoEnd.current) {
      skipAutoEnd.current = false;
      return;
    }
    const service = options?.services.find((item) => item.id === watchedServiceId);
    if (!service || !TIME_PATTERN.test(watchedStartTime)) return;
    setValue("endTime", addMinutes(toTimeInput(watchedStartTime), service.durationMinutes));
  }, [watchedServiceId, watchedStartTime, options, setValue]);

  const busy = pending || !options;

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent closeLabel="Cerrar" className="w-[min(92vw,36rem)]">
        <DialogTitle>{appointment ? "Editar turno" : "Crear turno"}</DialogTitle>
        <DialogDescription>
          Cliente, barbero, servicio y horario. El horario final se calcula con la duración del
          servicio.
        </DialogDescription>
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              customerId: values.customerId,
              barberId: values.barberId,
              serviceId: values.serviceId,
              appointmentDate: values.appointmentDate,
              startTime: toTimeStorage(values.startTime),
              endTime: toTimeStorage(values.endTime),
              status: values.status,
              notes: values.notes.trim() ? values.notes.trim() : null,
            });
          })}
        >
          <fieldset disabled={busy} className="space-y-4">
            <SelectField
              id="appointment-customer"
              label="Cliente"
              error={errors.customerId?.message}
              {...register("customerId")}
            >
              <option value="">Selecciona un cliente</option>
              {options?.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
              {appointment && !options?.customers.some((c) => c.id === appointment.customerId) ? (
                <option value={appointment.customerId}>
                  {appointment.customer?.name ?? "Cliente"} (inactivo)
                </option>
              ) : null}
            </SelectField>

            <SelectField
              id="appointment-barber"
              label="Barbero"
              error={errors.barberId?.message}
              {...register("barberId")}
            >
              <option value="">Selecciona un barbero</option>
              {options?.barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
              {appointment && !options?.barbers.some((b) => b.id === appointment.barberId) ? (
                <option value={appointment.barberId}>
                  {appointment.barber?.name ?? "Barbero"} (inactivo)
                </option>
              ) : null}
            </SelectField>

            <SelectField
              id="appointment-service"
              label="Servicio"
              error={errors.serviceId?.message}
              {...register("serviceId")}
            >
              <option value="">Selecciona un servicio</option>
              {options?.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} min
                </option>
              ))}
              {appointment && !options?.services.some((s) => s.id === appointment.serviceId) ? (
                <option value={appointment.serviceId}>
                  {appointment.service?.name ?? "Servicio"} (inactivo)
                </option>
              ) : null}
            </SelectField>

            <div className="space-y-2">
              <Label htmlFor="appointment-date">Fecha</Label>
              <Input
                id="appointment-date"
                type="date"
                {...register("appointmentDate")}
                aria-invalid={Boolean(errors.appointmentDate)}
                aria-describedby={errors.appointmentDate ? "appointment-date-error" : undefined}
              />
              {errors.appointmentDate ? (
                <p
                  id="appointment-date-error"
                  role="alert"
                  className="text-sm text-[var(--danger)]"
                >
                  {errors.appointmentDate.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appointment-start">Hora de inicio</Label>
                <Input
                  id="appointment-start"
                  type="time"
                  {...register("startTime")}
                  aria-invalid={Boolean(errors.startTime)}
                  aria-describedby={errors.startTime ? "appointment-start-error" : undefined}
                />
                {errors.startTime ? (
                  <p
                    id="appointment-start-error"
                    role="alert"
                    className="text-sm text-[var(--danger)]"
                  >
                    {errors.startTime.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment-end">Hora de finalización</Label>
                <Input
                  id="appointment-end"
                  type="time"
                  {...register("endTime")}
                  aria-invalid={Boolean(errors.endTime)}
                  aria-describedby={errors.endTime ? "appointment-end-error" : undefined}
                />
                {errors.endTime ? (
                  <p
                    id="appointment-end-error"
                    role="alert"
                    className="text-sm text-[var(--danger)]"
                  >
                    {errors.endTime.message}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              La hora final se calcula con la duración del servicio; puedes ajustarla a mano.
            </p>

            <SelectField
              id="appointment-status"
              label="Estado"
              error={errors.status?.message}
              {...register("status")}
            >
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {appointmentStatusLabel(status)}
                </option>
              ))}
            </SelectField>

            <div className="space-y-2">
              <Label htmlFor="appointment-notes">Notas (opcional)</Label>
              <textarea
                id="appointment-notes"
                rows={3}
                className="flex w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                {...register("notes")}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={errors.notes ? "appointment-notes-error" : undefined}
              />
              {errors.notes ? (
                <p
                  id="appointment-notes-error"
                  role="alert"
                  className="text-sm text-[var(--danger)]"
                >
                  {errors.notes.message}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" aria-busy={pending}>
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
