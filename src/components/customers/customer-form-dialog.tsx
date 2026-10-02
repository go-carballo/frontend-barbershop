import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateCustomerInput, Customer } from "@/features/customers/customers-api";

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre.").max(150, "Máximo 150 caracteres."),
  email: z.union([
    z
      .string()
      .trim()
      .email("Ingresa un correo electrónico válido.")
      .max(150, "Máximo 150 caracteres."),
    z.literal(""),
  ]),
  phone: z.string().max(30, "Máximo 30 caracteres."),
  isActive: z.boolean(),
});
type Values = z.infer<typeof customerSchema>;
export function CustomerFormDialog({
  customer,
  onClose,
  onSubmit,
  pending,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSubmit: (input: CreateCustomerInput) => Promise<void>;
  pending: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(customerSchema),
    mode: "onBlur",
    defaultValues: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      isActive: customer?.isActive ?? true,
    },
  });
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent closeLabel="Cerrar">
        <DialogTitle>{customer ? "Editar cliente" : "Crear cliente"}</DialogTitle>
        <DialogDescription>Nombre y datos de contacto del cliente.</DialogDescription>
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              email: values.email || (customer ? null : undefined),
              phone: values.phone || (customer ? null : undefined),
            });
          })}
        >
          <fieldset disabled={pending} className="space-y-4">
            {(
              [
                ["name", "Nombre", "text"],
                ["email", "Correo electrónico (opcional)", "email"],
                ["phone", "Teléfono (opcional)", "tel"],
              ] as const
            ).map(([field, label, type]) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={`customer-${field}`}>{label}</Label>
                <Input
                  id={`customer-${field}`}
                  type={type}
                  {...register(field)}
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={errors[field] ? `customer-${field}-error` : undefined}
                />
                {errors[field] && (
                  <p
                    id={`customer-${field}-error`}
                    role="alert"
                    className="text-sm text-[var(--danger)]"
                  >
                    {errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("isActive")} />
              Cliente activo
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
