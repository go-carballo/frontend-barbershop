import { http } from "@/lib/http";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CreateServiceInput = {
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  isActive?: boolean;
};
export type UpdateServiceInput = Partial<CreateServiceInput>;
export type ServicesParams = {
  page: number;
  perPage: number;
  search?: string;
  isActive?: "true" | "false";
};
export type ServicesResponse = { data: Service[]; total: number; page: number; perPage: number };
export const servicesKeys = {
  all: ["services"] as const,
  list: (params: ServicesParams, userId: string) => ["services", "list", userId, params] as const,
};
export const getServicesRequest = (params: ServicesParams, signal?: AbortSignal) => {
  const query = new URLSearchParams({ page: String(params.page), perPage: String(params.perPage) });
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", params.isActive);
  return http<ServicesResponse>(`/services?${query}`, { signal });
};
export const getServiceRequest = (id: string, signal?: AbortSignal) =>
  http<Service>(`/services/${encodeURIComponent(id)}`, { signal });
export const createServiceRequest = (input: CreateServiceInput) =>
  http<Service>("/services", { method: "POST", body: JSON.stringify(input) });
export const updateServiceRequest = (id: string, input: UpdateServiceInput) =>
  http<Service>(`/services/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteServiceRequest = (id: string) =>
  http<void>(`/services/${encodeURIComponent(id)}`, { method: "DELETE" });
