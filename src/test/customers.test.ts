import { HttpResponse, http as mswHttp } from "msw";
import { describe, expect, it, vi } from "vitest";
import { customerSchema } from "@/components/customers/customer-form-dialog";
import {
  canDeleteCustomers,
  canManageCustomers,
  createCustomerRequest,
  deleteCustomerRequest,
  getCustomersRequest,
  updateCustomerRequest,
} from "@/features/customers/customers-api";
import { server } from "@/test/server";

const customer = {
  id: "c1",
  name: "Ana",
  email: null,
  phone: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};
describe("Customers backend contract", () => {
  it("serializes server pagination, search and false status", async () => {
    server.use(
      mswHttp.get("*/customers", ({ request }) => {
        const query = new URL(request.url).searchParams;
        expect(Object.fromEntries(query)).toEqual({
          page: "2",
          perPage: "25",
          search: "Ana + 54",
          isActive: "false",
        });
        return HttpResponse.json({ data: [customer], total: 26, page: 2, perPage: 25 });
      }),
    );
    expect(
      await getCustomersRequest({ page: 2, perPage: 25, search: "Ana + 54", isActive: "false" }),
    ).toEqual({ data: [customer], total: 26, page: 2, perPage: 25 });
  });
  it("creates and patches nullable contacts and boolean status", async () => {
    server.use(
      mswHttp.post("*/customers", async ({ request }) => {
        expect(await request.json()).toEqual({ name: "Ana" });
        return HttpResponse.json(customer, { status: 201 });
      }),
      mswHttp.patch("*/customers/c1", async ({ request }) => {
        expect(await request.json()).toEqual({ email: null, phone: null, isActive: false });
        return HttpResponse.json({ ...customer, isActive: false });
      }),
    );
    await createCustomerRequest({ name: "Ana" });
    expect(
      (await updateCustomerRequest("c1", { email: null, phone: null, isActive: false })).isActive,
    ).toBe(false);
  });
  it("validates forms and distinguishes backend staff permissions", () => {
    expect(
      customerSchema.safeParse({ name: " ", email: "invalid", phone: "", isActive: true }).success,
    ).toBe(false);
    expect(
      customerSchema.safeParse({ name: "A", email: "", phone: "", isActive: false }).success,
    ).toBe(true);
    for (const role of ["admin", "receptionist", "barber"]) {
      const token = `header.${btoa(JSON.stringify({ role }))}.signature`;
      expect(canManageCustomers(token)).toBe(role !== "barber");
      expect(canDeleteCustomers(token)).toBe(role === "admin");
    }
  });
  it("deletes with empty success body and surfaces appointment conflicts", async () => {
    server.use(mswHttp.delete("*/customers/c1", () => new HttpResponse(null, { status: 200 })));
    await expect(deleteCustomerRequest("c1")).resolves.toBeUndefined();
    server.use(
      mswHttp.delete("*/customers/c1", () =>
        HttpResponse.json(
          { message: "Customer cannot be deleted because it is being used by an appointment." },
          { status: 409 },
        ),
      ),
    );
    await expect(deleteCustomerRequest("c1")).rejects.toMatchObject({ status: 409 });
  });
  it("routes query strings and UUID subpaths to the configured real host", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://nest.internal");
    vi.resetModules();
    try {
      const { http } = await import("@/lib/http");
      server.use(
        mswHttp.get("http://nest.internal/customers", () => HttpResponse.json({ total: 0 })),
        mswHttp.patch("http://nest.internal/customers/c1", () => HttpResponse.json(customer)),
      );
      expect(await http("/customers?page=1&isActive=false")).toEqual({ total: 0 });
      expect(await http("/customers/c1", { method: "PATCH", body: "{}" })).toEqual(customer);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
