import { screen } from "@testing-library/react";
import { defaultSession } from "@/mocks/data";
import { renderApp } from "@/test/test-app";
import type { Session } from "@/types";

const managerSession: Session = {
  user: {
    id: "m1",
    name: "Dana Manager",
    email: "dana@northstar.app",
    role: "Manager",
    organization: "Northstar",
  },
  isAuthenticated: true,
  accessToken: "mock-access-token",
  expiresAt: 4102444800000,
};

const seed = (session: Session) =>
  window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(session));

describe("role-based access control", () => {
  it("shows every nav item for an Owner session", async () => {
    seed(defaultSession);
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /barberos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /servicios/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /turnos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /users/i })).toBeInTheDocument();
  });

  it("hides role-restricted nav items for a Manager session", async () => {
    seed(managerSession);
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /turnos/i })).toBeInTheDocument();
    // Barberos y servicios son Owner/Admin: quedan ocultos para un Manager.
    expect(screen.queryByRole("link", { name: /barberos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /servicios/i })).not.toBeInTheDocument();
  });

  it("redirects a Manager away from a restricted route", async () => {
    seed(managerSession);
    renderApp({ initialEntries: ["/app/billing"] });

    expect(await screen.findByText(/dashboard overview/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /plans, usage and invoices/i }),
    ).not.toBeInTheDocument();
  });

  it("allows an Owner to reach a restricted route", async () => {
    seed(defaultSession);
    renderApp({ initialEntries: ["/app/billing"] });

    expect(
      await screen.findByRole("heading", { name: /plans, usage and invoices/i }),
    ).toBeInTheDocument();
  });
});
