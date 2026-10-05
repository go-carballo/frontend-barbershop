import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Barber, CreateBarberInput } from "@/features/barbers/barbers-api";

export const barberSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre.").max(150, "Máximo 150 caracteres."),
  email: z.union([
    z.string().trim().email("Ingresa un correo electrónico válido.").max(150),
    z.literal(""),
  ]),
  phone: z.string().max(30, "Máximo 30 caracteres."),
  specialty: z.string().trim().max(150, "Máximo 150 caracteres."),
  isActive: z.boolean(),
});
type Values = z.infer<typeof barberSchema>;

export function BarberFormDialog({
  barber,
  onClose,
  onSubmit,
  pending,
}: {
  barber: Barber | null;
  onClose: () => void;
  onSubmit: (input: CreateBarberInput) => Promise<void>;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(barberSchema),
    mode: "onBlur",
    defaultValues: {
      name: barber?.name ?? "",
      email: barber?.email ?? "",
      phone: barber?.phone ?? "",
      specialty: barber?.specialty ?? "",
      isActive: barber?.isActive ?? true,
    },
  });
  const fields = [
    ["name", "Nombre", "text"],
    ["email", "Correo electrónico (opcional)", "email"],
    ["phone", "Teléfono (opcional)", "tel"],
    ["specialty", "Especialidad (opcional)", "text"],
  ] as const;
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent closeLabel="Cerrar">
        <DialogTitle>{barber ? "Editar barbero" : "Crear barbero"}</DialogTitle>
        <DialogDescription>Datos de contacto y especialidad del barbero.</DialogDescription>
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit(async (values) =>
            onSubmit({
              ...values,
              email: values.email || (barber ? null : undefined),
              phone: values.phone || (barber ? null : undefined),
              specialty: values.specialty || (barber ? null : undefined),
            }),
          )}
        >
          <fieldset disabled={pending} className="space-y-4">
            {fields.map(([field, label, type]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`barber-${field}`}>{label}</Label>
                <Input
                  id={`barber-${field}`}
                  type={type}
                  {...register(field)}
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={errors[field] ? `barber-${field}-error` : undefined}
                />
                {errors[field] && (
                  <p
                    id={`barber-${field}-error`}
                    role="alert"
                    className="text-sm text-[var(--danger)]"
                  >
                    {errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("isActive")} /> Barbero activo
            </label>
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
