import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateServiceInput, Service } from "@/features/services/services-api";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre.").max(150, "Máximo 150 caracteres."),
  description: z.string().trim().max(500, "Máximo 500 caracteres."),
  durationMinutes: z.coerce
    .number()
    .int("Ingresa minutos enteros.")
    .positive("La duración debe ser mayor a cero.")
    .max(1440, "La duración no puede superar 1440 minutos."),
  price: z.coerce.number().nonnegative("El precio no puede ser negativo."),
  isActive: z.boolean(),
});
type Values = z.infer<typeof serviceSchema>;

export function ServiceFormDialog({
  service,
  onClose,
  onSubmit,
  pending,
}: {
  service: Service | null;
  onClose: () => void;
  onSubmit: (input: CreateServiceInput) => Promise<void>;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(serviceSchema),
    mode: "onBlur",
    defaultValues: {
      name: service?.name ?? "",
      description: service?.description ?? "",
      durationMinutes: service?.durationMinutes ?? 30,
      price: service?.price ?? 0,
      isActive: service?.isActive ?? true,
    },
  });
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent closeLabel="Cerrar">
        <DialogTitle>{service ? "Editar servicio" : "Crear servicio"}</DialogTitle>
        <DialogDescription>Nombre, duración y precio del servicio.</DialogDescription>
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit(async (values) =>
            onSubmit({
              ...values,
              description: values.description || (service ? null : undefined),
            }),
          )}
        >
          <fieldset disabled={pending} className="space-y-4">
            {(
              [
                ["name", "Nombre", "text", undefined],
                ["description", "Descripción (opcional)", "text", undefined],
                ["durationMinutes", "Duración (minutos)", "number", "1"],
                ["price", "Precio", "number", "0.01"],
              ] as const
            ).map(([field, label, type, step]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`service-${field}`}>{label}</Label>
                <Input
                  id={`service-${field}`}
                  type={type}
                  step={step}
                  min={field === "price" ? 0 : undefined}
                  {...register(field)}
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={errors[field] ? `service-${field}-error` : undefined}
                />
                {errors[field] && (
                  <p
                    id={`service-${field}-error`}
                    role="alert"
                    className="text-sm text-[var(--danger)]"
                  >
                    {errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("isActive")} /> Servicio activo
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
