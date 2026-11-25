import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarDays,
  CircleAlert,
  type LucideIcon,
  Scissors,
  Sparkles,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppointmentStatusBadge } from "@/components/appointments/appointment-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import {
  ChartSkeleton,
  KpiGridSkeleton,
  ListSkeleton,
  TableSkeleton,
} from "@/components/shared/skeletons";
import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appointmentsKeys, getAppointmentsRequest } from "@/features/appointments/appointments-api";
import { appointmentStatusLabel } from "@/features/appointments/appointments-status";
import { useAuth } from "@/features/auth/auth-context";
import { barbersKeys, getBarbersRequest } from "@/features/barbers/barbers-api";
import { customersKeys, getCustomersRequest } from "@/features/customers/customers-api";
import {
  type DashboardStats,
  dashboardKeys,
  getDashboardStatsRequest,
} from "@/features/dashboard/dashboard-api";
import {
  appointmentsByMonth,
  appointmentsByStatus,
  DASHBOARD_APPOINTMENTS_FETCH_SIZE,
  DASHBOARD_DIRECTORY_FETCH_SIZE,
  formatBusinessDate,
  formatLongBusinessDate,
  formatStartTime,
  formatTimestamp,
  localTodayIso,
  recentAppointments,
  topServices,
  upcomingAppointments,
} from "@/features/overview/overview-metrics";
import { getServicesRequest, servicesKeys } from "@/features/services/services-api";

const periodOptions = [
  { id: "3", label: "Últimos 3 meses" },
  { id: "6", label: "Últimos 6 meses" },
  { id: "12", label: "Últimos 12 meses" },
] as const;

type PeriodId = (typeof periodOptions)[number]["id"];

const numberFormatter = new Intl.NumberFormat("es-AR");

/** Same tone combinations the template already uses on its KPI cards. */
const kpiTones = {
  accent: "bg-[rgba(59,130,246,0.12)] text-[var(--accent)]",
  warning: "bg-[rgba(249,115,22,0.12)] text-[#ea580c]",
  positive: "bg-[rgba(34,197,94,0.12)] text-[#16a34a]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
} satisfies Record<string, string>;

type MetricCard = {
  id: string;
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
};

export const OverviewPage = () => {
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const [periodId, setPeriodId] = useState<PeriodId>("6");

  // Business date in local time; captured once per mount.
  const todayIso = useMemo(() => localTodayIso(), []);

  // Directory KPIs: the backend returns the exact filtered `total`.
  // These queries intentionally omit React Query's AbortSignal: jsdom signals
  // belong to a different realm than MSW's Request and crash the test suite
  // (the same constraint the customers/appointments tests document).
  const customersQuery = useQuery({
    queryKey: customersKeys.list({ page: 1, perPage: DASHBOARD_DIRECTORY_FETCH_SIZE }, userId),
    queryFn: () => getCustomersRequest({ page: 1, perPage: DASHBOARD_DIRECTORY_FETCH_SIZE }),
  });
  const barbersQuery = useQuery({
    queryKey: barbersKeys.list(
      { page: 1, perPage: DASHBOARD_DIRECTORY_FETCH_SIZE, isActive: "true" },
      userId,
    ),
    queryFn: () =>
      getBarbersRequest({ page: 1, perPage: DASHBOARD_DIRECTORY_FETCH_SIZE, isActive: "true" }),
  });
  const servicesQuery = useQuery({
    queryKey: servicesKeys.list(
      { page: 1, perPage: DASHBOARD_DIRECTORY_FETCH_SIZE, isActive: "true" },
      userId,
    ),
    queryFn: () =>
      getServicesRequest({ page: 1, perPage: DASHBOARD_DIRECTORY_FETCH_SIZE, isActive: "true" }),
  });
  // Dashboard stats from backend real API (mocked via MSW in dev)
  const dashboardQuery = useQuery({
    queryKey: dashboardKeys.stats(userId),
    queryFn: ({ signal }) => getDashboardStatsRequest(signal),
  });
  // Exact count for "Turnos de hoy": the endpoint filters on the business date.
  const todayQuery = useQuery({
    queryKey: appointmentsKeys.list({ page: 1, perPage: 1, appointmentDate: todayIso }, userId),
    queryFn: () => getAppointmentsRequest({ page: 1, perPage: 1, appointmentDate: todayIso }),
  });
  // Single shared appointments window reused by every chart and list below.
  const appointmentsQuery = useQuery({
    queryKey: appointmentsKeys.list(
      { page: 1, perPage: DASHBOARD_APPOINTMENTS_FETCH_SIZE },
      userId,
    ),
    queryFn: () => getAppointmentsRequest({ page: 1, perPage: DASHBOARD_APPOINTMENTS_FETCH_SIZE }),
  });

  const appointments = useMemo(() => appointmentsQuery.data?.data ?? [], [appointmentsQuery.data]);
  const monthSeries = useMemo(
    () => appointmentsByMonth(appointments, Number(periodId)),
    [appointments, periodId],
  );
  const serviceDemand = useMemo(() => topServices(appointments), [appointments]);
  const statusShares = useMemo(() => appointmentsByStatus(appointments), [appointments]);
  const upcoming = useMemo(
    () => upcomingAppointments(appointments, todayIso),
    [appointments, todayIso],
  );
  const recent = useMemo(() => recentAppointments(appointments), [appointments]);

  const canRenderChart = typeof navigator === "undefined" || !/jsdom/i.test(navigator.userAgent);
  const kpisLoading =
    customersQuery.isLoading ||
    barbersQuery.isLoading ||
    servicesQuery.isLoading ||
    todayQuery.isLoading ||
    dashboardQuery.isLoading;

  const revenue = dashboardQuery.data?.estimatedRevenue ?? 0;
  const upcomingCount = dashboardQuery.data?.upcomingAppointments ?? 0;

  const metricCards: MetricCard[] = [
    {
      id: "clientes",
      title: "Clientes totales",
      value: customersQuery.data ? numberFormatter.format(customersQuery.data.total) : "—",
      hint: "Registrados en el sistema",
      icon: Users,
      tone: kpiTones.accent,
    },
    {
      id: "barberos",
      title: "Barberos activos",
      value: barbersQuery.data ? numberFormatter.format(barbersQuery.data.total) : "—",
      hint: "Disponibles para agendar",
      icon: Scissors,
      tone: kpiTones.positive,
    },
    {
      id: "servicios",
      title: "Servicios activos",
      value: servicesQuery.data ? numberFormatter.format(servicesQuery.data.total) : "—",
      hint: "En carta actualmente",
      icon: Sparkles,
      tone: kpiTones.warning,
    },
    {
      id: "turnos-hoy",
      title: "Turnos de hoy",
      value: todayQuery.data ? numberFormatter.format(todayQuery.data.total) : "—",
      hint: `Hoy es ${formatLongBusinessDate(todayIso)}`,
      icon: CalendarCheck,
      tone: kpiTones.success,
    },
    {
      id: "ingresos-estimados",
      title: "Ingresos estimados",
      value: revenue > 0 ? `$${numberFormatter.format(revenue)}` : "—",
      hint: "De turnos completados",
      icon: Sparkles,
      tone: kpiTones.accent,
    },
  ];

  if (appointmentsQuery.isLoading || kpisLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Resumen"
          title="Resumen del panel"
          description="Métricas reales de clientes, barberos, servicios y turnos en un solo lugar."
        />
        <KpiGridSkeleton />
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.65fr]">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.7fr_0.8fr]">
          <TableSkeleton count={4} />
          <ChartSkeleton className="h-64 md:h-64" />
          <ListSkeleton count={3} />
        </div>
      </div>
    );
  }

  if (appointmentsQuery.isError) {
    return (
      <StatePanel
        kind="error"
        title="No se pudo cargar el resumen"
        description="Ocurrió un error al consultar los turnos de la barbería."
        retryLabel="Reintentar"
        onRetry={() => void appointmentsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumen"
        title="Resumen del panel"
        description="Métricas reales de clientes, barberos, servicios y turnos en un solo lugar."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full gap-2 md:w-auto">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {periodOptions.find((option) => option.id === periodId)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Periodo del gráfico</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={periodId}
                onValueChange={(value) => setPeriodId(value as PeriodId)}
              >
                {periodOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.id} value={option.id}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <KpiCard
            key={card.id}
            title={card.title}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.65fr]">
        <SectionCard tone="secondary" title="Turnos por mes">
          {canRenderChart ? (
            <div className="h-64 md:h-80" role="img" aria-label="Gráfico de área de turnos por mes">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthSeries}>
                  <defs>
                    <linearGradient id="appointmentsFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--chart-grid)" vertical />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="turnos"
                    stroke="var(--chart-line)"
                    strokeWidth={2}
                    fill="url(#appointmentsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          <table className="sr-only">
            <caption>Turnos por mes</caption>
            <thead>
              <tr>
                <th scope="col">Mes</th>
                <th scope="col">Turnos</th>
              </tr>
            </thead>
            <tbody>
              {monthSeries.map((point) => (
                <tr key={point.key}>
                  <td>{point.name}</td>
                  <td>{point.turnos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard tone="secondary" title="Servicios más solicitados">
          {canRenderChart ? (
            <div
              className="h-64 md:h-80"
              role="img"
              aria-label="Gráfico de barras de los servicios más solicitados"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceDemand} barGap={8}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="name"
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Bar dataKey="turnos" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          <table className="sr-only">
            <caption>Servicios más solicitados</caption>
            <thead>
              <tr>
                <th scope="col">Servicio</th>
                <th scope="col">Turnos</th>
              </tr>
            </thead>
            <tbody>
              {serviceDemand.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.turnos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.7fr_0.8fr]">
        <SectionCard
          title="Próximos turnos"
          description={`Faltan ${upcomingCount} turnos esta semana.`}
        >
          {upcoming.length === 0 ? (
            <EmptyState
              title="No hay turnos próximos"
              description="Cuando se agenden turnos aparecerán en esta lista."
            />
          ) : (
            <div className="overflow-x-auto rounded-[0.75rem] border border-[var(--border)]">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.6fr_0.8fr] gap-3 border-b border-[var(--border)] bg-[var(--surface-panel)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  <span>Cliente</span>
                  <span>Barbero</span>
                  <span>Servicio</span>
                  <span>Fecha</span>
                  <span>Hora</span>
                  <span>Estado</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {upcoming.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="grid grid-cols-[1.2fr_1fr_1fr_0.9fr_0.6fr_0.8fr] gap-3 px-4 py-3 text-sm"
                    >
                      <span className="truncate font-medium text-[var(--foreground)]">
                        {appointment.customer?.name ?? "Cliente"}
                      </span>
                      <span className="truncate text-[var(--muted-foreground)]">
                        {appointment.barber?.name ?? "Barbero"}
                      </span>
                      <span className="truncate text-[var(--muted-foreground)]">
                        {appointment.service?.name ?? "Servicio"}
                      </span>
                      <span>{formatBusinessDate(appointment.appointmentDate)}</span>
                      <span>{formatStartTime(appointment.startTime)}</span>
                      <span>
                        <AppointmentStatusBadge status={appointment.status} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard tone="secondary" title="Ingresos por servicio">
          {canRenderChart && dashboardQuery.data?.serviceBreakdown.length > 0 ? (
            <div className="space-y-3">
              {dashboardQuery.data.serviceBreakdown.map((svc) => (
                <div
                  key={svc.serviceName}
                  className="flex items-center justify-between rounded-lg bg-[var(--surface-panel)] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {svc.serviceName}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">{svc.total} turnos</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--accent)]">
                    ${numberFormatter.format(svc.revenue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin ingresos registrados"
              description="Los ingresos aparecerán cuando se completen turnos."
            />
          )}
        </SectionCard>

        <SectionCard tone="secondary" title="Turnos por estado">
          {canRenderChart ? (
            <div className="h-64" role="img" aria-label="Gráfico circular de turnos por estado">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusShares}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusShares.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {statusShares.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name} · {entry.value}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          tone="secondary"
          title="Actividad reciente"
          description="Últimos turnos actualizados."
        >
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Todavía no hay turnos registrados.
            </p>
          ) : (
            <div className="space-y-3">
              {recent.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex gap-3 rounded-[0.9rem] border border-[var(--border)] bg-[var(--surface-panel)] px-4 py-3 text-sm text-[var(--foreground-muted)]"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--foreground)]">
                      {appointment.customer?.name ?? "Cliente"} ·{" "}
                      {appointment.service?.name ?? "Servicio"}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {appointmentStatusLabel(appointment.status)} ·{" "}
                      {formatTimestamp(appointment.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};
