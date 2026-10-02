import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { vi } from "vitest";
import { defaultSession } from "@/mocks/data";
import { server } from "@/test/server";
import { renderApp } from "@/test/test-app";

// jsdom signals belong to a different realm than Node fetch.
vi.mock("@/features/customers/customers-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/customers/customers-api")>();
  return {
    ...api,
    getCustomersRequest: (params: import("@/features/customers/customers-api").CustomersParams) =>
      api.getCustomersRequest(params),
  };
});

it("applies search only on Enter/blur, clears once and supports all customer operations", async () => {
  const user = userEvent.setup();
  const customer = {
    id: "c1",
    name: "Ana",
    email: null,
    phone: null,
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
  const queries: URLSearchParams[] = [];
  const patches: unknown[] = [];
  let deletes = 0;
  server.use(
    http.get("*/customers", ({ request }) => {
      const query = new URL(request.url).searchParams;
      queries.push(query);
      return HttpResponse.json({
        data: [customer],
        total: 11,
        page: Number(query.get("page")),
        perPage: Number(query.get("perPage")),
      });
    }),
    http.get("*/auth/profile", () =>
      HttpResponse.json({
        id: defaultSession.user.id,
        email: defaultSession.user.email,
        role: "admin",
      }),
    ),
    http.post("*/customers", async ({ request }) => {
      expect(await request.json()).toEqual({ name: "Bea", isActive: true });
      return HttpResponse.json(customer, { status: 201 });
    }),
    http.patch("*/customers/c1", async ({ request }) => {
      const input = await request.json();
      patches.push(input);
      Object.assign(customer, input);
      return HttpResponse.json(customer);
    }),
    http.delete("*/customers/c1", () => {
      deletes++;
      return new HttpResponse(null, { status: 200 });
    }),
  );
  window.localStorage.setItem(
    "admin-dashboard-template:session",
    JSON.stringify({
      ...defaultSession,
      accessToken: `header.${btoa(JSON.stringify({ role: "admin" }))}.signature`,
    }),
  );
  renderApp({ initialEntries: ["/app/customers"] });
  await screen.findByText("Ana");
  await user.click(screen.getByRole("button", { name: "Siguiente" }));
  await screen.findByText("Página 2 de 2");
  const search = screen.getByRole("searchbox", { name: "Buscar clientes" });
  const beforeTyping = queries.length;
  await user.type(search, "Ana");
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(queries).toHaveLength(beforeTyping);
  await user.keyboard("{Enter}");
  await waitFor(() => expect(queries).toHaveLength(beforeTyping + 1));
  expect(queries.at(-1)?.get("search")).toBe("Ana");
  expect(queries.at(-1)?.get("page")).toBe("1");
  await user.tab();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(queries).toHaveLength(beforeTyping + 1);
  await user.click(search);
  await user.type(search, " Maria");
  expect(queries).toHaveLength(beforeTyping + 1);
  await user.tab();
  await waitFor(() => expect(queries).toHaveLength(beforeTyping + 2));
  expect(queries.at(-1)?.get("search")).toBe("Ana Maria");
  await user.click(search);
  await user.type(search, " pendiente");
  const beforeClear = queries.length;
  await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
  await waitFor(() => expect(queries).toHaveLength(beforeClear + 1));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(queries).toHaveLength(beforeClear + 1);
  expect(search).toHaveValue("");
  expect(queries.at(-1)?.has("search")).toBe(false);
  expect(queries.at(-1)?.get("page")).toBe("1");
  await user.type(search, "sin aplicar");
  const beforeDraftClear = queries.length;
  await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
  await waitFor(() => expect(queries).toHaveLength(beforeDraftClear + 1));
  await user.click(screen.getByRole("button", { name: "Inactivos" }));
  await waitFor(() => expect(queries.at(-1)?.get("isActive")).toBe("false"));
  await user.selectOptions(screen.getByLabelText("Clientes por página"), "25");
  await waitFor(() => expect(queries.at(-1)?.get("perPage")).toBe("25"));
  expect(screen.getByText("11 resultados")).toBeInTheDocument();
  expect(screen.getByText("Activo", { exact: true })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Crear cliente" }));
  await user.type(screen.getByLabelText("Nombre"), "Bea");
  const beforeCreate = queries.length;
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(queries.length).toBeGreaterThan(beforeCreate));
  await user.click(screen.getByRole("button", { name: "Editar" }));
  await user.clear(screen.getByLabelText("Nombre"));
  await user.type(screen.getByLabelText("Nombre"), "Ana Maria");
  const beforeEdit = queries.length;
  await user.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(queries.length).toBeGreaterThan(beforeEdit));
  expect(patches[0]).toEqual({ name: "Ana Maria", email: null, phone: null, isActive: true });
  await user.click(screen.getByRole("button", { name: "Desactivar" }));
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  await screen.findByText("Inactivo", { exact: true });
  expect(patches[1]).toEqual({ isActive: false });
  await user.click(screen.getByRole("button", { name: "Activar" }));
  await user.click(screen.getByRole("button", { name: "Confirmar" }));
  await screen.findByText("Activo", { exact: true });
  expect(patches[2]).toEqual({ isActive: true });
  await user.click(screen.getByRole("button", { name: "Eliminar" }));
  const beforeDelete = queries.length;
  await user.click(screen.getByRole("button", { name: "Eliminar" }));
  await waitFor(() => expect(deletes).toBe(1));
  await waitFor(() => expect(queries.length).toBeGreaterThan(beforeDelete));
});
