import { http } from "@/lib/http";

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CreateCustomerInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
};
export type UpdateCustomerInput = Partial<CreateCustomerInput>;
export type CustomersParams = {
  page: number;
  perPage: number;
  search?: string;
  isActive?: "true" | "false";
};
export type CustomersResponse = { data: Customer[]; total: number; page: number; perPage: number };
export const customersKeys = {
  all: ["customers"] as const,
  list: (params: CustomersParams, userId: string) => ["customers", "list", userId, params] as const,
};
export const getCustomersRequest = (params: CustomersParams, signal?: AbortSignal) => {
  const query = new URLSearchParams({ page: String(params.page), perPage: String(params.perPage) });
  if (params.search) query.set("search", params.search);
  if (params.isActive !== undefined) query.set("isActive", params.isActive);
  return http<CustomersResponse>(`/customers?${query}`, { signal });
};
export const getCustomerRequest = (id: string, signal?: AbortSignal) =>
  http<Customer>(`/customers/${encodeURIComponent(id)}`, { signal });
export const createCustomerRequest = (input: CreateCustomerInput) =>
  http<Customer>("/customers", { method: "POST", body: JSON.stringify(input) });
export const updateCustomerRequest = (id: string, input: UpdateCustomerInput) =>
  http<Customer>(`/customers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

// The token carries the backend's role verbatim; these checks mirror its guards.
export const canManageCustomers = (token?: string) => {
  try {
    const segment = token?.split(".")[1] ?? "";
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const { role } = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return role === "admin" || role === "receptionist";
  } catch {
    return false;
  }
};

export const deleteCustomerRequest = (id: string) =>
  http<void>(`/customers/${encodeURIComponent(id)}`, { method: "DELETE" });
export const canDeleteCustomers = (token?: string) => {
  try {
    const segment = token?.split(".")[1] ?? "";
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))).role === "admin";
  } catch {
    return false;
  }
};
