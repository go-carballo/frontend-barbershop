import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { type Column, DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatePanel } from "@/components/shared/state-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import {
  type CreateServiceInput,
  createServiceRequest,
  deleteServiceRequest,
  getServicesRequest,
  type Service,
  type ServicesParams,
  servicesKeys,
  updateServiceRequest,
} from "@/features/services/services-api";
import { notifyError, notifySuccess } from "@/lib/notify";

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Intenta nuevamente.";
const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});
export function ServicesPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<ServicesParams>({ page: 1, perPage: 10 });
  const [form, setForm] = useState<{ service: Service | null } | null>(null);
  const [statusTarget, setStatusTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const list = useQuery({
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryKey: servicesKeys.list(params, session?.user.id ?? ""),
    queryFn: ({ signal }) => getServicesRequest(params, signal),
  });
  useEffect(() => {
    if (list.data && params.page > 1 && list.data.data.length === 0)
      setParams((previous) => ({
        ...previous,
        page: Math.max(1, Math.ceil(list.data.total / previous.perPage)),
      }));
  }, [list.data, params.page]);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: servicesKeys.all });
  const save = useMutation({
    mutationFn: ({ service, input }: { service: Service | null; input: CreateServiceInput }) =>
      service ? updateServiceRequest(service.id, input) : createServiceRequest(input),
    onSuccess: async () => {
      setForm(null);
      notifySuccess("Servicio guardado.");
      await invalidate();
    },
    onError: (error) => notifyError(new Error(errorMessage(error))),
  });
  const status = useMutation({
    mutationFn: (service: Service) =>
      updateServiceRequest(service.id, { isActive: !service.isActive }),
    onSuccess: async () => {
      setStatusTarget(null);
      notifySuccess("Estado actualizado.");
      await invalidate();
    },
    onError: (error) => notifyError(new Error(errorMessage(error))),
  });
  const remove = useMutation({
    mutationFn: deleteServiceRequest,
    onSuccess: async () => {
      setDeleteTarget(null);
      notifySuccess("Servicio eliminado.");
      await invalidate();
    },
    onError: (error) => notifyError(new Error(errorMessage(error))),
  });
  const columns: Column<Service>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (row) => <span className="font-medium text-[var(--foreground)]">{row.name}</span>,
    },
    { key: "description", header: "Descripción", render: (row) => row.description ?? "—" },
    { key: "duration", header: "Duración", render: (row) => `${row.durationMinutes} min` },
    { key: "price", header: "Precio", render: (row) => currency.format(row.price) },
    {
      key: "status",
      header: "Estado",
      render: (row) => <StatusBadge status={row.isActive ? "Activo" : "Inactivo"} />,
    },
    {
      key: "actions",
      header: "Acciones",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2 whitespace-nowrap">
          <Button variant="outline" size="sm" onClick={() => setForm({ service: row })}>
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={status.isPending}
            onClick={() => setStatusTarget(row)}
          >
            {row.isActive ? "Desactivar" : "Activar"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={remove.isPending}
            onClick={() => setDeleteTarget(row)}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];
  const applySearch = () =>
    setParams((previous) => {
      const next = search.trim() || undefined;
      return previous.search === next ? previous : { ...previous, page: 1, search: next };
    });
  const clearSearch = () => {
    setSearch("");
    setParams((previous) =>
      previous.search === undefined && previous.page === 1
        ? previous
        : { ...previous, page: 1, search: undefined },
    );
  };
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Servicios"
        title="Servicios"
        description="Gestiona el catálogo de servicios, precios y duraciones."
        actions={<Button onClick={() => setForm({ service: null })}>Crear servicio</Button>}
      />
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        onApply={applySearch}
        onClear={clearSearch}
        clearLabel="Limpiar búsqueda"
        filtersLabel="Estado del servicio"
        formatResultCount={(count) => `${count} ${count === 1 ? "resultado" : "resultados"}`}
        resultCount={list.data?.total}
        title="Buscar servicios"
        description="Busca por nombre o descripción. Presiona Enter o sal del campo para buscar."
        searchLabel="Buscar servicios"
        searchPlaceholder="Nombre o descripción…"
        inputId="services-search"
        chips={[
          { id: "all", label: "Todos" },
          { id: "true", label: "Activos" },
          { id: "false", label: "Inactivos" },
        ]}
        activeChip={params.isActive ?? "all"}
        onChipChange={(id) =>
          setParams((previous) => ({
            ...previous,
            page: 1,
            isActive: id === "all" ? undefined : (id as "true" | "false"),
          }))
        }
      />
      <label className="flex items-center gap-2 text-sm">
        Servicios por página
        <select
          className="rounded border border-[var(--border)] bg-[var(--surface)] p-2"
          value={params.perPage}
          onChange={(event) =>
            setParams((previous) => ({ ...previous, page: 1, perPage: Number(event.target.value) }))
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
        <TableSkeleton count={6} loadingLabel="Cargando servicios" />
      ) : list.isError ? (
        <StatePanel
          kind="error"
          title="No se pudieron cargar los servicios"
          description={errorMessage(list.error)}
          retryLabel="Reintentar"
          onRetry={() => void list.refetch()}
        />
      ) : list.data.data.length === 0 ? (
        <EmptyState
          title="No se encontraron servicios"
          description="Prueba otra búsqueda o cambia el filtro de estado."
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
          caption="Servicios"
          pageSize={list.data.perPage}
          pagination={{
            page: list.data.page,
            total: list.data.total,
            onPageChange: (page) => setParams((previous) => ({ ...previous, page })),
          }}
        />
      )}
      {form && (
        <ServiceFormDialog
          service={form.service}
          pending={save.isPending}
          onClose={() => setForm(null)}
          onSubmit={async (input) => {
            try {
              await save.mutateAsync({ service: form.service, input });
            } catch {
              /* mutation error shown above */
            }
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.isActive ? "Desactivar servicio" : "Activar servicio"}
        description={`¿Cambiar el estado de ${statusTarget?.name ?? "este servicio"}?`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={() => statusTarget && !status.isPending && status.mutate(statusTarget)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar servicio"
        description={`¿Eliminar definitivamente ${deleteTarget?.name ?? "este servicio"}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => deleteTarget && !remove.isPending && remove.mutate(deleteTarget.id)}
      />
    </div>
  );
}
