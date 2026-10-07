import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { type FilterChip, SearchFilterBar } from "@/components/shared/search-filter-bar";
import { TableSkeleton } from "@/components/shared/skeletons";
import { StatePanel } from "@/components/shared/state-panel";
import { Button } from "@/components/ui/button";
import { UserFormDialog } from "@/components/users/invite-user-dialog";
import { UsersTable } from "@/components/users/users-table";
import { useAuth } from "@/features/auth/auth-context";
import {
  type CreateUserInput,
  createUserRequest,
  deleteUserRequest,
  getUsersRequest,
  type UpdateUserInput,
  updateUserRequest,
  usersKeys,
} from "@/features/users/users-api";
import type { UserRecord } from "@/types";

const chips: FilterChip[] = [
  { id: "all", label: "Todos" },
  { id: "admin", label: "Administradores" },
  { id: "barber", label: "Barberos" },
  { id: "receptionist", label: "Recepcionistas" },
];
export const UsersPage = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [editing, setEditing] = useState<UserRecord | null | undefined>();
  const deferred = useDeferredValue(search);
  const query = useQuery({
    queryKey: usersKeys.list(session?.user.id ?? ""),
    queryFn: ({ signal }) => getUsersRequest(signal),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: usersKeys.all });
  const create = useMutation({
    mutationFn: createUserRequest,
    onSuccess: (user) => {
      invalidate();
      setEditing(undefined);
      toast.success(`Usuario ${user.name} creado.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUserRequest(id, input),
    onSuccess: (user) => {
      invalidate();
      setEditing(undefined);
      toast.success(`Usuario ${user.name} actualizado.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: deleteUserRequest,
    onSuccess: () => {
      invalidate();
      toast.success("Usuario eliminado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const users = useMemo(
    () =>
      (query.data ?? []).filter(
        (u) =>
          (role === "all" || u.role === role) &&
          `${u.name} ${u.email}`.toLowerCase().includes(deferred.toLowerCase()),
      ),
    [query.data, role, deferred],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Usuarios"
        description="Gestiona las cuentas y los niveles de acceso del equipo."
        actions={
          <Button onClick={() => setEditing(null)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Crear usuario
          </Button>
        }
      />
      <SearchFilterBar
        value={search}
        onChange={setSearch}
        resultCount={users.length}
        title="Usuarios"
        description="Filtra por nombre, correo o rol."
        searchLabel="Buscar usuarios"
        inputId="users-search"
        chips={chips}
        activeChip={role}
        onChipChange={setRole}
      />
      {query.isLoading && <TableSkeleton />}
      {query.isError && (
        <StatePanel
          kind="error"
          title="No se pudieron cargar los usuarios"
          description="El servidor no respondió."
          onRetry={() => void query.refetch()}
        />
      )}
      {query.data && users.length > 0 && (
        <UsersTable
          users={users}
          onEdit={setEditing}
          onDelete={(user) => remove.mutate(user.id)}
          isDeleting={remove.isPending}
        />
      )}
      {query.data && users.length === 0 && (
        <EmptyState
          title="No hay usuarios"
          description="No hay usuarios que coincidan con los filtros."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setRole("all");
              }}
            >
              Limpiar filtros
            </Button>
          }
        />
      )}
      <UserFormDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        user={editing}
        isSubmitting={create.isPending || update.isPending}
        onSubmit={async (input) => {
          if (editing)
            await update.mutateAsync({ id: editing.id, input: input as UpdateUserInput });
          else await create.mutateAsync(input as CreateUserInput);
        }}
      />
    </div>
  );
};
