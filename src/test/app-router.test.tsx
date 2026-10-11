import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultSession } from "@/mocks/data";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { renderApp } from "@/test/test-app";

beforeEach(() => useOverviewFixture());

describe("rutas de BarberShop", () => {
  it("redirige rutas protegidas al inicio de sesión", async () => {
    renderApp({ initialEntries: ["/app/overview"] });
    expect(await screen.findByText(/bienvenido/i)).toBeInTheDocument();
  });

  it("muestra el panel para una sesión válida", async () => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    renderApp({ initialEntries: ["/app/overview"] });
    expect(await screen.findByRole("heading", { name: /turnos por mes/i })).toBeInTheDocument();
  });

  it("redirige el calendario histórico a turnos", async () => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    renderApp({ initialEntries: ["/app/calendar"] });
    expect(await screen.findByRole("tab", { name: "Calendario" })).toBeInTheDocument();
  });
});
