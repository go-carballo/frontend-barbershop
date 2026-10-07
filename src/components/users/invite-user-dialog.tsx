import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateUserInput, UpdateUserInput } from "@/features/users/users-api";
import type { AppRole, UserRecord } from "@/types";

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").or(z.literal("")),
  role: z.enum(["admin", "barber", "receptionist"]),
  isActive: z.boolean(),
});
type UserFormValues = z.infer<typeof schema>;
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRecord | null;
  onSubmit: (values: CreateUserInput | UpdateUserInput) => Promise<void>;
  isSubmitting: boolean;
};
const roles: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "barber", label: "Barbero" },
  { value: "receptionist", label: "Recepcionista" },
];

export const UserFormDialog = ({ open, onOpenChange, user, onSubmit, isSubmitting }: Props) => {
  const editing = Boolean(user);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "receptionist", isActive: true },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;
  useEffect(() => {
    if (open)
      reset(
        user
          ? {
              name: user.name,
              email: user.email,
              password: "",
              role: user.role,
              isActive: user.isActive,
            }
          : { name: "", email: "", password: "", role: "receptionist", isActive: true },
      );
  }, [open, reset, user]);
  const submit = handleSubmit(async (values) => {
    const { password, ...rest } = values;
    await onSubmit(editing && password === "" ? rest : values);
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{editing ? "Editar usuario" : "Crear usuario"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Actualiza los datos y el acceso del usuario."
            : "Crea una cuenta para el equipo."}
        </DialogDescription>
        <form className="mt-4 space-y-4" onSubmit={submit} noValidate autoComplete="off">
          <Field label="Nombre" id="user-name" error={errors.name?.message}>
            <Input
              id="user-name"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </Field>
          <Field label="Correo electrónico" id="user-email" error={errors.email?.message}>
            <Input
              id="user-email"
              type="email"
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </Field>
          <Field
            label={`Contraseña${editing ? " (dejar vacía para mantenerla)" : ""}`}
            id="user-password"
            error={errors.password?.message}
          >
            <Input
              id="user-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Rol</legend>
            {roles.map((role) => (
              <label key={role.value} className="mr-4 inline-flex items-center gap-2 text-sm">
                <input type="radio" value={role.value} {...register("role")} />
                {role.label}
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isActive")} />
            Activo
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {error && (
      <p role="alert" className="text-sm text-[var(--danger)]">
        {error}
      </p>
    )}
  </div>
);
