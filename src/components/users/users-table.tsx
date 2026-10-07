import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { type Column, DataTable } from "@/components/shared/data-table";
import { DefinitionList, DetailDrawer } from "@/components/shared/detail-drawer";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserCell } from "@/components/shared/user-cell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRecord } from "@/types";

const roleLabel: Record<UserRecord["role"], string> = {
  admin: "Administrador",
  barber: "Barbero",
  receptionist: "Recepcionista",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
type Props = {
  users: UserRecord[];
  onEdit: (user: UserRecord) => void;
  onDelete: (user: UserRecord) => void;
  isDeleting?: boolean;
};
export const UsersTable = ({ users, onEdit, onDelete, isDeleting }: Props) => {
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserRecord | null>(null);
  const columns: Column<UserRecord>[] = [
    { key: "user", header: "Usuario", render: (u) => <UserCell user={u} /> },
    {
      key: "role",
      header: "Rol",
      render: (u) => roleLabel[u.role],
      sortValue: (u) => roleLabel[u.role],
    },
    {
      key: "status",
      header: "Estado",
      render: (u) => <StatusBadge status={u.isActive ? "Activo" : "Inactivo"} />,
      sortValue: (u) => Number(u.isActive),
    },
    {
      key: "updated",
      header: "Actualizado",
      render: (u) => date(u.updatedAt),
      sortValue: (u) => u.updatedAt,
    },
    {
      key: "actions",
      header: "Acciones",
      className: "w-16",
      render: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Acciones de ${u.name}`}
              onClick={(event) => event.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                onEdit(u);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[var(--danger)]"
              onClick={(event) => {
                event.stopPropagation();
                setPendingDelete(u);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <>
      <DataTable
        columns={columns}
        rows={users}
        getRowKey={(u) => u.id}
        onRowClick={setSelected}
        getRowLabel={(u) => `Ver ${u.name}`}
        caption="Usuarios"
        labels={{
          range: (a, b, total) => `Mostrando ${a}–${b} de ${total}`,
          page: (p, total) => `Página ${p} de ${total}`,
          previous: "Anterior",
          next: "Siguiente",
        }}
      />
      <DetailDrawer
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.name ?? "Usuario"}
        description={selected?.email}
      >
        {selected && (
          <DefinitionList
            items={[
              { label: "Rol", value: roleLabel[selected.role] },
              {
                label: "Estado",
                value: <StatusBadge status={selected.isActive ? "Activo" : "Inactivo"} />,
              },
              { label: "Creado", value: date(selected.createdAt) },
              { label: "Actualizado", value: date(selected.updatedAt) },
            ]}
          />
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Eliminar usuario"
        description={`Se eliminará permanentemente a ${pendingDelete?.name ?? "este usuario"}.`}
        confirmLabel={isDeleting ? "Eliminando…" : "Eliminar"}
        cancelLabel="Cancelar"
        destructive
        onConfirm={() => pendingDelete && onDelete(pendingDelete)}
      />
    </>
  );
};
