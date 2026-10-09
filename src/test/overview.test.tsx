import { screen, within } from "@testing-library/react";
import { defaultSession } from "@/mocks/data";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { renderApp } from "@/test/test-app";

/** Values can also appear inside the sr-only chart tables, so scope by card. */
const kpiCard = (title: string) => {
  const titleNode = screen.getByText(title);
  expect(titleNode.parentElement).not.toBeNull();
  return within(titleNode.parentElement as HTMLElement);
};

describe("BarberShop dashboard", () => {
  beforeEach(() => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    useOverviewFixture();
  });

  it("renders real metrics, charts and upcoming appointments in Spanish", async () => {
    renderApp({ initialEntries: ["/app/overview"] });

    // KPI cards derived from the real directory endpoints.
    expect(await screen.findByText("Clientes totales")).toBeInTheDocument();
    expect(kpiCard("Clientes totales").getByText("24")).toBeInTheDocument();
    expect(kpiCard("Barberos activos").getByText("3")).toBeInTheDocument();
    expect(kpiCard("Servicios activos").getByText("5")).toBeInTheDocument();
    expect(await screen.findByText("Turnos de hoy")).toBeInTheDocument();
    expect(kpiCard("Turnos de hoy").getByText("2")).toBeInTheDocument();

    // Charts aggregate the shared appointments window.
    expect(await screen.findByRole("heading", { name: "Turnos por mes" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Servicios más solicitados" }),
    ).toBeInTheDocument();
    // Service names appear both in the sr-only chart table and in the rows.
    expect(screen.getAllByText("Corte de cabello").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Barba y bigote").length).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "Turnos por estado" })).toBeInTheDocument();
    expect(screen.getByText("Programados · 2")).toBeInTheDocument();
    expect(screen.getByText("Completados · 1")).toBeInTheDocument();

    // Upcoming appointments exclude past days and translate the status.
    expect(await screen.findByRole("heading", { name: "Próximos turnos" })).toBeInTheDocument();
    expect(screen.getAllByText("María López").length).toBeGreaterThan(0);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.queryByText("Pedro Ruiz")).not.toBeInTheDocument();

    // Activity feed derived from the most recently updated appointments.
    expect(await screen.findByRole("heading", { name: "Actividad reciente" })).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez · Corte de cabello")).toBeInTheDocument();
  });

  it("keeps the whole dashboard visible in Spanish", async () => {
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("heading", { name: "Resumen del panel" })).toBeInTheDocument();
    expect(await screen.findByText("Registrados en el sistema")).toBeInTheDocument();
    expect(screen.getByText("Disponibles para agendar")).toBeInTheDocument();
    expect(screen.getByText("En carta actualmente")).toBeInTheDocument();
    expect(screen.getByText("Turnos agendados a partir de hoy.")).toBeInTheDocument();
    expect(screen.getByText("Últimos turnos actualizados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /últimos 6 meses/i })).toBeInTheDocument();
    expect(screen.queryByText(/monthly sales/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/recent transactions/i)).not.toBeInTheDocument();
  });
});
