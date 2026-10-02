import { Badge } from "@/components/ui/badge";
import type { UserStatus } from "@/types";

const statusVariantMap: Record<
  UserStatus | "Activo" | "Inactivo",
  "success" | "warning" | "outline"
> = {
  Active: "success",
  Activo: "success",
  Inactivo: "outline",
  Invited: "warning",
  Paused: "outline",
};

export const StatusBadge = ({ status }: { status: UserStatus | "Activo" | "Inactivo" }) => (
  <Badge variant={statusVariantMap[status]}>{status}</Badge>
);
