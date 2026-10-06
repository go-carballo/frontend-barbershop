import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import { AppointmentStatusBadge } from "@/components/appointments/appointment-status-badge";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { type Column, DataTable } from "@/components/shared/data-table";
import { DefinitionList, DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ChartSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppointmentOptions } from "@/features/appointments/appointment-options";
import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentListParams,
  type AppointmentStatus,
  appointmentsKeys,
  CALENDAR_FETCH_SIZE,
  type CreateAppointmentInput,
  canCreateAppointment,
  canManageAppointment,
  createAppointmentRequest,
  deleteAppointmentRequest,
  getAppointmentRequest,
  getAppointmentsRequest,
  updateAppointmentRequest,
} from "@/features/appointments/appointments-api";
import { appointmentErrorMessage } from "@/features/appointments/appointments-errors";
import {
  appointmentStatusLabel,
  appointmentTone,
} from "@/features/appointments/appointments-status";
import { useAuth } from "@/features/auth/auth-context";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { CalendarEvent } from "@/types";

type View = "list" | "calendar";

const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, "0")}`;

const monthLabel = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const formatDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("es-AR", { timeZone: "UTC" });

const formatTime = (time: string) => time.slice(0, 5);

const formatPrice = (price: number) => price.toLocaleString("es-AR");

/** The backend relations are optional, so every cell falls back to the raw id. */
const toCalendarEvent = (appointment: Appointment): CalendarEvent => ({
  id: appointment.id,
  date: appointment.appointmentDate,
  time: formatTime(appointment.startTime),
  title: `${appointment.customer?.name ?? "Cliente"} · ${appointment.service?.name ?? "Servicio"}`,
  tone: appointmentTone(appointment.status),
});

const filterSelectClass =
  "flex h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

type FilterSelectProps = {
  id: string;
  label: string;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

const FilterSelect = ({ id, label, value, allLabel, options, onChange }: FilterSelectProps) => (
  <div className="min-w-44 flex-1 space-y-1.5">
    <Label
      htmlFor={id}
      className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]"
    >
      {label}
    </Label>
    <select
      id={id}
      className={filterSelectClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export function AppointmentsPage() {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const token = session?.accessToken;
  const uiRole = session?.user.role;
  const canCreate = canCreateAppointment(token, uiRole);
  const canManage = canManageAppointment(token, uiRole);
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("list");
  const [params, setParams] = useState<AppointmentListParams>({ page: 1, perPage: 10 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ appointment: Appointment | null; date?: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [statusDraft, setStatusDraft] = useState<AppointmentStatus | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    appointment: Appointment;
    status: AppointmentStatus;
  } | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const options = useAppointmentOptions(userId);

  const list = useQuery({
    queryKey: appointmentsKeys.list(params, userId),
    queryFn: ({ signal }) => getAppointmentsRequest(params, signal),
    enabled: view === "list",
    refetchOnWindowFocus: false,
  });

  /**
   * Backend debt: there is no `from`/`to` filter, so one request per visible
   * month is impossible. We fetch the newest `perPage=100` appointments once and
   * filter the month in the client (see `CALENDAR_FETCH_SIZE`).
   */
  const calendar = useQuery({
    queryKey: appointmentsKeys.calendar(userId),
    queryFn: ({ signal }) =>
      getAppointmentsRequest({ page: 1, perPage: CALENDAR_FETCH_SIZE }, signal),
    enabled: view === "calendar",
    refetchOnWindowFocus: false,
  });

  const detail = useQuery({
    queryKey: appointmentsKeys.detail(selectedId),
    queryFn: ({ signal }) => getAppointmentRequest(selectedId ?? "", signal),
    enabled: Boolean(selectedId),
  });

  const save = useMutation({
    mutationFn: ({
      appointment,
      input,
    }: {
      appointment: Appointment | null;
      input: CreateAppointmentInput;
    }) =>
      appointment
        ? updateAppointmentRequest(appointment.id, input)
        : createAppointmentRequest(input),
    onSuccess: async () => {
      setForm(null);
      notifySuccess("Turno guardado.");
      await queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    },
    onError: (error) => notifyError(new Error(appointmentErrorMessage(error))),
  });

  const changeStatus = useMutation({
    mutationFn: ({
      appointment,
      status,
    }: {
      appointment: Appointment;
      status: AppointmentStatus;
    }) => updateAppointmentRequest(appointment.id, { status }),
    onSuccess: async (_data, variables) => {
      setStatusTarget(null);
      setStatusDraft(null);
      notifySuccess(`Turno ${appointmentStatusLabel(variables.status).toLowerCase()}.`);
      await queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    },
    onError: (error) => notifyError(new Error(appointmentErrorMessage(error))),
  });

  const remove = useMutation({
    mutationFn: deleteAppointmentRequest,
    onSuccess: async (_, id) => {
      if (selectedId === id) setSelectedId(null);
      setDeleteTarget(null);
      notifySuccess("Turno eliminado.");
      await queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    },
    onError: (error) => notifyError(new Error(appointmentErrorMessage(error))),
  });

  const updateFilter = (patch: Partial<AppointmentListParams>) =>
    setParams((previous) => ({ ...previous, page: 1, ...patch }));

  const hasFilters = Boolean(
    params.customerId ||
      params.barberId ||
      params.serviceId ||
      params.appointmentDate ||
      params.status,
  );

  const monthPrefix = monthKey(cursor.year, cursor.month);
  const monthAppointments = (calendar.data?.data ?? []).filter((appointment) =>
    appointment.appointmentDate.startsWith(monthPrefix),
  );
  const events = monthAppointments.map(toCalendarEvent);

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  const columns: Column<Appointment>[] = [
    {
      key: "date",
      header: "Fecha",
      render: (row) => <span className="font-medium">{formatDay(row.appointmentDate)}</span>,
    },
    {
      key: "time",
      header: "Horario",
      render: (row) => `${formatTime(row.startTime)} – ${formatTime(row.endTime)}`,
    },
    { key: "customer", header: "Cliente", render: (row) => row.customer?.name ?? row.customerId },
    { key: "barber", header: "Barbero", render: (row) => row.barber?.name ?? row.barberId },
    { key: "service", header: "Servicio", render: (row) => row.service?.name ?? row.serviceId },
    {
      key: "status",
      header: "Estado",
      render: (row) => <AppointmentStatusBadge status={row.status} />,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Acciones",
            headerClassName: "text-right",
            className: "text-right",
            render: (row: Appointment) => (
              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setForm({ appointment: row });
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(row);
                  }}
                >
                  Eliminar
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  const detailAppointment = detail.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Turnos"
        title="Turnos"
        description="Administrá los turnos de la peluquería en lista o en calendario."
        actions={
          canCreate ? (
            <Button onClick={() => setForm({ appointment: null })}>Nuevo turno</Button>
          ) : undefined
        }
      />

      <Tabs value={view} onValueChange={(value) => setView(value as View)}>
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col gap-4 rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] lg:flex-row lg:items-end">
            <FilterSelect
              id="appointments-filter-status"
              label="Estado"
              allLabel="Todos los estados"
              value={params.status ?? ""}
              options={APPOINTMENT_STATUSES.map((status) => ({
                value: status,
                label: appointmentStatusLabel(status),
              }))}
              onChange={(value) =>
                updateFilter({ status: (value || undefined) as AppointmentStatus | undefined })
              }
            />
            <FilterSelect
              id="appointments-filter-customer"
              label="Cliente"
              allLabel="Todos los clientes"
              value={params.customerId ?? ""}
              options={(options.data?.customers ?? []).map((customer) => ({
                value: customer.id,
                label: customer.name,
              }))}
              onChange={(value) => updateFilter({ customerId: value || undefined })}
            />
            <FilterSelect
              id="appointments-filter-barber"
              label="Barbero"
              allLabel="Todos los barberos"
              value={params.barberId ?? ""}
              options={(options.data?.barbers ?? []).map((barber) => ({
                value: barber.id,
                label: barber.name,
              }))}
              onChange={(value) => updateFilter({ barberId: value || undefined })}
            />
            <FilterSelect
              id="appointments-filter-service"
              label="Servicio"
              allLabel="Todos los servicios"
              value={params.serviceId ?? ""}
              options={(options.data?.services ?? []).map((service) => ({
                value: service.id,
                label: service.name,
              }))}
              onChange={(value) => updateFilter({ serviceId: value || undefined })}
            />
            <div className="space-y-1.5">
              <Label
                htmlFor="appointments-filter-date"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]"
              >
                Fecha
              </Label>
              <Input
                id="appointments-filter-date"
                type="date"
                value={params.appointmentDate ?? ""}
                onChange={(event) =>
                  updateFilter({ appointmentDate: event.target.value || undefined })
                }
              />
            </div>
            <div className="flex items-end gap-3">
              <Button
                variant="outline"
                disabled={!hasFilters}
                onClick={() =>
                  setParams((previous) => ({
                    ...previous,
                    page: 1,
                    customerId: undefined,
                    barberId: undefined,
                    serviceId: undefined,
                    appointmentDate: undefined,
                    status: undefined,
                  }))
                }
              >
                Limpiar filtros
              </Button>
              <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">
                {typeof list.data?.total === "number"
                  ? `${list.data.total} ${list.data.total === 1 ? "turno" : "turnos"}`
                  : ""}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            Turnos por página
            <select
              className="rounded border border-[var(--border)] bg-[var(--surface)] p-2"
              value={params.perPage}
              onChange={(event) =>
                setParams((previous) => ({
                  ...previous,
                  page: 1,
                  perPage: Number(event.target.value),
                }))
              }
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          {list.isPending ? (
            <TableSkeleton count={6} loadingLabel="Cargando turnos" />
          ) : list.isError ? (
            <StatePanel
              kind="error"
              title="No se pudieron cargar los turnos"
              description={appointmentErrorMessage(list.error)}
              retryLabel="Reintentar"
              onRetry={() => void list.refetch()}
            />
          ) : list.data.data.length === 0 ? (
            <EmptyState
              title="No se encontraron turnos"
              description={
                hasFilters
                  ? "Probá quitando algún filtro o creá un turno nuevo."
                  : "Creá el primer turno para empezar a agendar clientes."
              }
              action={
                canCreate ? (
                  <Button onClick={() => setForm({ appointment: null })}>Nuevo turno</Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              labels={{
                range: (start, end, total) => `Mostrando ${start}–${end} de ${total}`,
                page: (page, count) => `Página ${page} de ${count}`,
                previous: "Anterior",
                next: "Siguiente",
              }}
              columns={columns}
              rows={list.data.data}
              getRowKey={(row) => row.id}
              onRowClick={(row) => setSelectedId(row.id)}
              getRowLabel={(row) => `Ver turno de ${row.customer?.name ?? row.customerId}`}
              caption="Turnos"
              pageSize={list.data.perPage}
              pagination={{
                page: list.data.page,
                total: list.data.total,
                onPageChange: (page) => setParams((previous) => ({ ...previous, page })),
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const now = new Date();
                setCursor({ year: now.getFullYear(), month: now.getMonth() });
              }}
            >
              <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            {canCreate ? (
              <span className="ml-auto text-xs text-[var(--muted-foreground)]">
                Tocá el número de un día para crear un turno.
              </span>
            ) : null}
          </div>

          <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-1 border-b border-[var(--border)] px-5 py-4">
              <p className="text-base font-semibold capitalize">
                {monthLabel(cursor.year, cursor.month)}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {monthAppointments.length} {monthAppointments.length === 1 ? "turno" : "turnos"}
              </p>
            </div>
            {calendar.isPending ? (
              <ChartSkeleton className="m-4 h-[28rem]" />
            ) : calendar.isError ? (
              <div className="p-4">
                <StatePanel
                  kind="error"
                  title="No se pudieron cargar los turnos"
                  description={appointmentErrorMessage(calendar.error)}
                  retryLabel="Reintentar"
                  onRetry={() => void calendar.refetch()}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[52rem] p-4">
                  <CalendarGrid
                    year={cursor.year}
                    month={cursor.month}
                    events={events}
                    onEventClick={(event) => setSelectedId(event.id)}
                    onDayClick={
                      canCreate ? (date) => setForm({ appointment: null, date }) : undefined
                    }
                  />
                </div>
              </div>
            )}
            {calendar.data && calendar.data.total > CALENDAR_FETCH_SIZE ? (
              <p className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--warning)]">
                Se muestran los {CALENDAR_FETCH_SIZE} turnos más recientes: el backend todavía no
                admite filtros por rango de fechas.
              </p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      {form ? (
        <AppointmentFormDialog
          appointment={form.appointment}
          defaultDate={form.date}
          options={options.data}
          pending={save.isPending}
          onClose={() => setForm(null)}
          onSubmit={async (input) => {
            try {
              await save.mutateAsync({ appointment: form.appointment, input });
            } catch {
              /* onError reports the backend message; the dialog keeps its values. */
            }
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title="Cambiar estado"
        description={`¿Cambiar el estado del turno a ${
          statusTarget ? appointmentStatusLabel(statusTarget.status).toLowerCase() : ""
        }?`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (statusTarget && !changeStatus.isPending) changeStatus.mutate(statusTarget);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar turno"
        description={`¿Eliminar el turno de ${
          deleteTarget?.customer?.name ?? "este cliente"
        }? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          if (deleteTarget && !remove.isPending) remove.mutate(deleteTarget.id);
        }}
      />

      <DetailDrawer
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setStatusDraft(null);
          }
        }}
        title={
          detailAppointment
            ? `Turno de ${detailAppointment.customer?.name ?? detailAppointment.customerId}`
            : "Turno"
        }
        description="Detalle del turno"
        closeLabel="Cerrar"
        footer={
          detailAppointment ? (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                {canManage ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setForm({ appointment: detailAppointment })}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTarget(detailAppointment)}
                    >
                      Eliminar
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Tu rol permite consultar los turnos.
                  </p>
                )}
              </div>
              {canManage ? (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="appointment-detail-status">Estado</Label>
                    <select
                      id="appointment-detail-status"
                      className={filterSelectClass}
                      value={statusDraft ?? detailAppointment.status}
                      onChange={(event) => setStatusDraft(event.target.value as AppointmentStatus)}
                    >
                      {APPOINTMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {appointmentStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="sm"
                    disabled={
                      !statusDraft ||
                      statusDraft === detailAppointment.status ||
                      changeStatus.isPending
                    }
                    onClick={() =>
                      setStatusTarget({
                        appointment: detailAppointment,
                        status: statusDraft ?? detailAppointment.status,
                      })
                    }
                  >
                    Cambiar
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null
        }
      >
        {detail.isPending ? (
          <StatePanel kind="loading" title="Cargando turno" description="Consultando el turno." />
        ) : detail.isError ? (
          <StatePanel
            kind="error"
            title="No se pudo cargar el turno"
            description={appointmentErrorMessage(detail.error)}
            retryLabel="Reintentar"
            onRetry={() => void detail.refetch()}
          />
        ) : detailAppointment ? (
          <div className="space-y-4">
            <DefinitionList
              items={[
                {
                  label: "Cliente",
                  value: detailAppointment.customer?.name ?? detailAppointment.customerId,
                },
                {
                  label: "Barbero",
                  value: detailAppointment.barber?.name ?? detailAppointment.barberId,
                },
                {
                  label: "Servicio",
                  value: detailAppointment.service?.name ?? detailAppointment.serviceId,
                },
                { label: "Fecha", value: formatDay(detailAppointment.appointmentDate) },
                {
                  label: "Horario",
                  value: `${formatTime(detailAppointment.startTime)} – ${formatTime(detailAppointment.endTime)}`,
                },
                {
                  label: "Estado",
                  value: <AppointmentStatusBadge status={detailAppointment.status} />,
                },
                {
                  label: "Precio",
                  value: detailAppointment.service
                    ? formatPrice(detailAppointment.service.price)
                    : "—",
                },
                {
                  label: "Duración",
                  value: detailAppointment.service
                    ? `${detailAppointment.service.durationMinutes} min`
                    : "—",
                },
                { label: "Notas", value: detailAppointment.notes || "—" },
                { label: "ID", value: detailAppointment.id },
              ]}
            />
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  );
}
