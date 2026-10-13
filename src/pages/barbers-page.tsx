import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BarberFormDialog } from "@/components/barbers/barber-form-dialog";
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
  type Barber,
  type BarbersParams,
  barbersKeys,
  type CreateBarberInput,
  createBarberRequest,
  deleteBarberRequest,
  getBarbersRequest,
  updateBarberRequest,
} from "@/features/barbers/barbers-api";
import { notifyError, notifySuccess } from "@/lib/notify";

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : "Intenta nuevamente.";
export function BarbersPage() {
  const { session } = useAuth();
  const canManage = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<BarbersParams>({ page: 1, perPage: 10 });
  const [form, setForm] = useState<{ barber: Barber | null } | null>(null);
  const [statusTarget, setStatusTarget] = useState<Barber | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Barber | null>(null);
  const list = useQuery({
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryKey: barbersKeys.list(params, session?.user.id ?? ""),
    queryFn: ({ signal }) => getBarbersRequest(params, signal),
  });
  useEffect(() => {
    if (list.data && params.page > 1 && list.data.data.length === 0)
      setParams((previous) => ({
        ...previous,
        page: Math.max(1, Math.ceil(list.data.total / previous.perPage)),
      }));
  }, [list.data, params.page]);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: barbersKeys.all });
  const save = useMutation({
    mutationFn: ({ barber, input }: { barber: Barber | null; input: CreateBarberInput }) =>
      barber ? updateBarberRequest(barber.id, input) : createBarberRequest(input),
    onSuccess: async () => {
      setForm(null);
      notifySuccess("Barbero guardado.");
      await invalidate();
    },
    onError: (error) => notifyError(new Error(errorMessage(error))),
  });
  const status = useMutation({
    mutationFn: (barber: Barber) => updateBarberRequest(barber.id, { isActive: !barber.isActive }),
    onSuccess: async () => {
      setStatusTarget(null);
      notifySuccess("Estado actualizado.");
      await invalidate();
    },
    onError: (error) => notifyError(new Error(errorMessage(error))),
  });
  const remove = useMutation({
    mutationFn: deleteBarberRequest,
    onSuccess: async () => {
      setDeleteTarget(null);
      notifySuccess("Barbero eliminado.");
      await invalidate();
    },
    onError: (error) => notifyError(new Error(errorMessage(error))),
  });
  const columns: Column<Barber>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (row) => <span className="font-medium text-[var(--foreground)]">{row.name}</span>,
    },
    { key: "email", header: "Correo electrónico", render: (row) => row.email ?? "—" },
    { key: "phone", header: "Teléfono", render: (row) => row.phone ?? "—" },
    { key: "specialty", header: "Especialidad", render: (row) => row.specialty ?? "—" },
    {
      key: "status",
      header: "Estado",
      render: (row) => <StatusBadge status={row.isActive ? "Activo" : "Inactivo"} />,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Acciones",
            headerClassName: "text-right",
            className: "text-right",
            render: (row: Barber) => (
              <div className="flex justify-end gap-2 whitespace-nowrap">
                <Button variant="outline" size="sm" onClick={() => setForm({ barber: row })}>
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
        ]
      : []),
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
        eyebrow="Barberos"
        title="Barberos"
        description="Gestiona el equipo de barberos y sus especialidades."
        actions={
          canManage ? (
            <Button onClick={() => setForm({ barber: null })}>Crear barbero</Button>
          ) : undefined
        }
      />
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        onApply={applySearch}
        onClear={clearSearch}
        clearLabel="Limpiar búsqueda"
        filtersLabel="Estado del barbero"
        formatResultCount={(count) => `${count} ${count === 1 ? "resultado" : "resultados"}`}
        resultCount={list.data?.total}
        title="Buscar barberos"
        description="Busca por nombre, correo, teléfono o especialidad. Presiona Enter o sal del campo para buscar."
        searchLabel="Buscar barberos"
        searchPlaceholder="Nombre, correo, teléfono o especialidad…"
        inputId="barbers-search"
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
        Barberos por página
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
        <TableSkeleton count={6} loadingLabel="Cargando barberos" />
      ) : list.isError ? (
        <StatePanel
          kind="error"
          title="No se pudieron cargar los barberos"
          description={errorMessage(list.error)}
          retryLabel="Reintentar"
          onRetry={() => void list.refetch()}
        />
      ) : list.data.data.length === 0 ? (
        <EmptyState
          title="No se encontraron barberos"
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
          caption="Barberos"
          pageSize={list.data.perPage}
          pagination={{
            page: list.data.page,
            total: list.data.total,
            onPageChange: (page) => setParams((previous) => ({ ...previous, page })),
          }}
        />
      )}
      {canManage && form && (
        <BarberFormDialog
          barber={form.barber}
          pending={save.isPending}
          onClose={() => setForm(null)}
          onSubmit={async (input) => {
            try {
              await save.mutateAsync({ barber: form.barber, input });
            } catch {
              /* mutation error shown above */
            }
          }}
        />
      )}
      {canManage && (
        <ConfirmDialog
          open={Boolean(statusTarget)}
          onOpenChange={(open) => !open && setStatusTarget(null)}
          title={statusTarget?.isActive ? "Desactivar barbero" : "Activar barbero"}
          description={`¿Cambiar el estado de ${statusTarget?.name ?? "este barbero"}?`}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          onConfirm={() => statusTarget && !status.isPending && status.mutate(statusTarget)}
        />
      )}
      {canManage && (
        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Eliminar barbero"
          description={`¿Eliminar definitivamente a ${deleteTarget?.name ?? "este barbero"}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          destructive
          onConfirm={() => deleteTarget && !remove.isPending && remove.mutate(deleteTarget.id)}
        />
      )}
    </div>
  );
}
