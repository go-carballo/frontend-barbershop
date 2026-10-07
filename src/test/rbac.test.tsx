import { screen } from "@testing-library/react";
import { defaultSession } from "@/mocks/data";
import { renderApp } from "@/test/test-app";
import type { Session } from "@/types";

const barberSession: Session = {
  user: {
    id: "m1",
    name: "Dana Barber",
    email: "dana@northstar.app",
    role: "barber",
    organization: "Northstar",
  },
  isAuthenticated: true,
  accessToken: "mock-access-token",
  expiresAt: 4102444800000,
};

const seed = (session: Session) =>
  window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(session));

describe("role-based access control", () => {
  it("shows every real module for an admin session", async () => {
    seed(defaultSession);
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /barberos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /servicios/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /turnos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /users/i })).toBeInTheDocument();
  });

  it("hides Administración for a barber while preserving read modules", async () => {
    seed(barberSession);
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /turnos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /barberos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /servicios/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /users/i })).not.toBeInTheDocument();
  });

  it("redirects a barber away from Usuarios", async () => {
    seed(barberSession);
    renderApp({ initialEntries: ["/app/users"] });

    expect(await screen.findByText(/dashboard overview/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^usuarios$/i })).not.toBeInTheDocument();
  });

  it("allows an admin to reach Usuarios", async () => {
    seed(defaultSession);
    renderApp({ initialEntries: ["/app/users"] });

    expect(await screen.findByRole("heading", { name: /^usuarios$/i })).toBeInTheDocument();
  });
});
