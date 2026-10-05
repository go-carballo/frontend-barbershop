import { http } from "@/lib/http";

export type Barber = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CreateBarberInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  specialty?: string | null;
  isActive?: boolean;
};
export type UpdateBarberInput = Partial<CreateBarberInput>;
export type BarbersParams = {
  page: number;
  perPage: number;
  search?: string;
  isActive?: "true" | "false";
};
export type BarbersResponse = { data: Barber[]; total: number; page: number; perPage: number };
export const barbersKeys = {
  all: ["barbers"] as const,
  list: (params: BarbersParams, userId: string) => ["barbers", "list", userId, params] as const,
};
export const getBarbersRequest = (params: BarbersParams, signal?: AbortSignal) => {
  const query = new URLSearchParams({ page: String(params.page), perPage: String(params.perPage) });
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", params.isActive);
  return http<BarbersResponse>(`/barbers?${query}`, { signal });
};
export const getBarberRequest = (id: string, signal?: AbortSignal) =>
  http<Barber>(`/barbers/${encodeURIComponent(id)}`, { signal });
export const createBarberRequest = (input: CreateBarberInput) =>
  http<Barber>("/barbers", { method: "POST", body: JSON.stringify(input) });
export const updateBarberRequest = (id: string, input: UpdateBarberInput) =>
  http<Barber>(`/barbers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteBarberRequest = (id: string) =>
  http<void>(`/barbers/${encodeURIComponent(id)}`, { method: "DELETE" });
