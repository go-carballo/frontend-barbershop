import { screen } from "@testing-library/react";
import { defaultSession } from "@/mocks/data";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { renderApp } from "@/test/test-app";

// The dashboard reads the real BarberShop endpoints, so landing on
// /app/overview needs backend-shaped responses for them.
beforeEach(() => useOverviewFixture());

const routes: { path: string; heading: RegExp }[] = [
  { path: "/app/analytics", heading: /reports and product health/i },
  { path: "/app/team", heading: /members, roles and access/i },
  { path: "/app/billing", heading: /plans, usage and invoices/i },
  { path: "/app/transactions", heading: /payments and charges/i },
  { path: "/app/notifications", heading: /alerts and in-app messages/i },
  { path: "/app/support", heading: /tickets and feedback/i },
  { path: "/app/integrations", heading: /connected apps and api keys/i },
];

describe("module pages", () => {
  it.each(routes)("renders %s", async ({ path, heading }) => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    renderApp({ initialEntries: [path] });
    expect(
      await screen.findByRole("heading", { name: heading }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("renders the BarberShop dashboard bottom zone from backend-shaped endpoints", async () => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByText("Clientes totales")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Próximos turnos" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Actividad reciente" })).toBeInTheDocument();
    expect(screen.getAllByText("Ana Pérez").length).toBeGreaterThan(0);
  });
});
