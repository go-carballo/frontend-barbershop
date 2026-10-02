import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { type Column, DataTable } from "@/components/shared/data-table";
import { DefinitionList, DetailDrawer } from "@/components/shared/detail-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatePanel } from "@/components/shared/state-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import {
  type CreateCustomerInput,
  type Customer,
  type CustomersParams,
  canDeleteCustomers,
  canManageCustomers,
  createCustomerRequest,
  customersKeys,
  deleteCustomerRequest,
  getCustomerRequest,
  getCustomersRequest,
  updateCustomerRequest,
} from "@/features/customers/customers-api";
import { customerErrorMessage } from "@/features/customers/customers-errors";
import { notifyError, notifySuccess } from "@/lib/notify";

export function CustomersPage() {
  const { session } = useAuth();
  const canDelete = canDeleteCustomers(session?.accessToken);
  const canManage = canManageCustomers(session?.accessToken);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [params, setParams] = useState<CustomersParams>({ page: 1, perPage: 10 });
  const [form, setForm] = useState<{ customer: Customer | null } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Customer | null>(null);
  const applySearch = () =>
    setParams((previous) => {
      const nextSearch = search.trim() || undefined;
      return previous.search === nextSearch
        ? previous
        : { ...previous, page: 1, search: nextSearch };
    });
  const clearSearch = () => {
    setSearch("");
    if (params.search === undefined && params.page === 1) {
      void list.refetch();
      return;
    }
    setParams((previous) =>
      previous.search === undefined && previous.page === 1
        ? previous
        : { ...previous, page: 1, search: undefined },
    );
  };
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const list = useQuery({
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryKey: customersKeys.list(params, session?.user.id ?? ""),
    queryFn: ({ signal }) => getCustomersRequest(params, signal),
  });
  const detail = useQuery({
    queryKey: ["customers", "detail", session?.user.id, selectedId],
    queryFn: ({ signal }) => getCustomerRequest(selectedId ?? "", signal),
    enabled: Boolean(selectedId),
  });
  useEffect(() => {
    if (list.data && params.page > 1 && list.data.data.length === 0) {
      setParams((previous) => ({
        ...previous,
        page: Math.max(1, Math.ceil(list.data.total / previous.perPage)),
      }));
    }
  }, [list.data, params.page]);
  const save = useMutation({
    mutationFn: ({ customer, input }: { customer: Customer | null; input: CreateCustomerInput }) =>
      customer ? updateCustomerRequest(customer.id, input) : createCustomerRequest(input),
    onSuccess: async () => {
      setForm(null);
      notifySuccess("Cliente guardado.");
      await queryClient.invalidateQueries({ queryKey: customersKeys.all });
    },
    onError: (error) => notifyError(new Error(customerErrorMessage(error))),
  });
  const status = useMutation({
    mutationFn: (customer: Customer) =>
      updateCustomerRequest(customer.id, { isActive: !customer.isActive }),
    onSuccess: async () => {
      notifySuccess("Estado actualizado.");
      await queryClient.invalidateQueries({ queryKey: customersKeys.all });
    },
    onError: (error) => notifyError(new Error(customerErrorMessage(error))),
  });
  const remove = useMutation({
    mutationFn: deleteCustomerRequest,
    onSuccess: async (_, id) => {
      if (selectedId === id) setSelectedId(null);
      notifySuccess("Cliente eliminado.");
      await queryClient.invalidateQueries({ queryKey: customersKeys.all });
    },
    onError: (error) =>
      notifyError(
        new Error(
          error instanceof Error && error.message.includes("being used by an appointment")
            ? "No se puede eliminar el cliente porque tiene turnos asociados."
            : "No se pudo eliminar el cliente. Intenta nuevamente.",
        ),
      ),
  });
  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (row) => <span className="font-medium text-[var(--foreground)]">{row.name}</span>,
    },
    { key: "email", header: "Correo electrónico", render: (row) => row.email ?? "—" },
    { key: "phone", header: "Teléfono", render: (row) => row.phone ?? "—" },
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
            render: (row: Customer) => (
              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setForm({ customer: row });
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={status.isPending}
                  onClick={(event) => {
                    event.stopPropagation();
                    setStatusTarget(row);
                  }}
                >
                  {row.isActive ? "Desactivar" : "Activar"}
                </Button>
                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(row);
                    }}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clientes"
        title="Clientes"
        description="Gestiona los clientes y sus datos de contacto."
        actions={
          canManage && <Button onClick={() => setForm({ customer: null })}>Crear cliente</Button>
        }
      />
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        onApply={applySearch}
        onClear={clearSearch}
        clearLabel="Limpiar búsqueda"
        filtersLabel="Estado del cliente"
        formatResultCount={(count) => `${count} ${count === 1 ? "resultado" : "resultados"}`}
        resultCount={list.data?.total}
        title="Buscar clientes"
        description="Busca por nombre, correo o teléfono. Presiona Enter o sal del campo para buscar."
        searchLabel="Buscar clientes"
        searchPlaceholder="Nombre, correo, teléfono…"
        inputId="customers-search"
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
        Clientes por página
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
        <TableSkeleton count={6} loadingLabel="Cargando clientes" />
      ) : list.isError ? (
        <StatePanel
          kind="error"
          title="No se pudieron cargar los clientes"
          description={customerErrorMessage(list.error)}
          retryLabel="Reintentar"
          onRetry={() => void list.refetch()}
        />
      ) : list.data.data.length === 0 ? (
        <EmptyState
          title="No se encontraron clientes"
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
          onRowClick={(row) => setSelectedId(row.id)}
          getRowLabel={(row) => `Ver cliente ${row.name}`}
          caption="Clientes"
          pageSize={list.data.perPage}
          pagination={{
            page: list.data.page,
            total: list.data.total,
            onPageChange: (page) => setParams((previous) => ({ ...previous, page })),
          }}
        />
      )}
      {form && (
        <CustomerFormDialog
          customer={form.customer}
          pending={save.isPending}
          onClose={() => setForm(null)}
          onSubmit={async (input) => {
            try {
              await save.mutateAsync({ customer: form.customer, input });
            } catch {
              /* onError reports the backend error; keep form values. */
            }
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.isActive ? "Desactivar cliente" : "Activar cliente"}
        description={`¿Cambiar el estado de ${statusTarget?.name ?? "este cliente"}?`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (statusTarget && !status.isPending) status.mutate(statusTarget);
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar cliente"
        description={`¿Eliminar definitivamente a ${deleteTarget?.name ?? "este cliente"}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => {
          if (deleteTarget && !remove.isPending) remove.mutate(deleteTarget.id);
        }}
      />
      <DetailDrawer
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        title={detail.data?.name ?? "Cliente"}
        description="Datos del cliente"
        closeLabel="Cerrar"
      >
        {detail.isPending ? (
          <StatePanel
            kind="loading"
            title="Cargando cliente"
            description="Consultando los datos del cliente."
          />
        ) : detail.isError ? (
          <StatePanel
            kind="error"
            title="No se pudo cargar el cliente"
            description={customerErrorMessage(detail.error)}
            retryLabel="Reintentar"
            onRetry={() => void detail.refetch()}
          />
        ) : (
          detail.data && (
            <DefinitionList
              items={[
                { label: "Nombre", value: detail.data.name },
                { label: "Correo electrónico", value: detail.data.email ?? "—" },
                { label: "Teléfono", value: detail.data.phone ?? "—" },
                {
                  label: "Estado",
                  value: <StatusBadge status={detail.data.isActive ? "Activo" : "Inactivo"} />,
                },
                { label: "Creado", value: new Date(detail.data.createdAt).toLocaleString("es-AR") },
                { label: "Actualizado", value: new Date(detail.data.updatedAt).toLocaleString() },
                { label: "ID", value: detail.data.id },
              ]}
            />
          )
        )}
      </DetailDrawer>
    </div>
  );
}
