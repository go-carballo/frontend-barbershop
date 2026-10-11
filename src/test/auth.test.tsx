import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { normalizeRole } from "@/lib/rbac";
import { defaultSession } from "@/mocks/data";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { server } from "@/test/server";
import { renderApp } from "@/test/test-app";
import type { Session } from "@/types";

const SESSION_KEY = "admin-dashboard-template:session";

const seedSession = (session: Session = defaultSession) =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

// The dashboard now reads the real BarberShop endpoints; every test that lands
// on /app/overview needs backend-shaped responses for them.
beforeEach(() => useOverviewFixture());

/**
 * A session as the app builds it after `POST /auth/login`: the role comes from
 * the JWT claim and goes through `normalizeRole` before reaching the UI.
 */
const sessionFromBackendToken = (role: string, email: string): Session => ({
  ...defaultSession,
  user: { ...defaultSession.user, id: "usr_backend", name: "", email, role: normalizeRole(role) },
});

describe("auth & session", () => {
  it("validates the stored token with GET /auth/profile on boot", async () => {
    seedSession();
    const sentTokens: (string | null)[] = [];
    server.use(
      http.get("/auth/profile", ({ request }) => {
        sentTokens.push(request.headers.get("Authorization"));
        return HttpResponse.json({
          id: "usr_backend_1",
          email: "admin@barbershop.com",
          role: "admin",
        });
      }),
    );

    renderApp({ initialEntries: ["/app/overview"] });
    await screen.findByText(/resumen del panel/i, {}, { timeout: 3000 });

    await waitFor(() => expect(sentTokens.length).toBeGreaterThan(0));
    expect(sentTokens[0]).toBe(`Bearer ${defaultSession.accessToken}`);
  });

  it("keeps the session across a reload while the token is valid", async () => {
    seedSession();
    let profileCalls = 0;
    server.use(
      http.get("/auth/profile", () => {
        profileCalls += 1;
        return HttpResponse.json({
          id: "usr_backend_1",
          email: "admin@barbershop.com",
          role: "admin",
        });
      }),
    );

    renderApp({ initialEntries: ["/app/overview"] });

    // A second mount with the same storage simulates the reload.
    expect(
      await screen.findByText(/resumen del panel/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(profileCalls).toBeGreaterThan(0);
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it("signs the user out on boot when the stored token is expired", async () => {
    seedSession({ ...defaultSession, expiresAt: Date.now() - 1000 });

    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByText(/bienvenido/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("logs out on the frontend only, without calling the backend", async () => {
    seedSession();
    let backendCalls = 0;
    server.use(
      http.post("/api/auth/logout", () => {
        backendCalls += 1;
        return HttpResponse.json({ success: true });
      }),
    );
    const user = userEvent.setup();

    renderApp({ initialEntries: ["/app/overview"] });
    await screen.findByText(/resumen del panel/i, {}, { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: /Administrador/i }));
    await user.click(await screen.findByRole("menuitem", { name: /cerrar sesión/i }));

    expect(await screen.findByText(/bienvenido/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(backendCalls).toBe(0);
  });

  it("normalizes the backend `admin` role so RoleRoute allows the route", async () => {
    seedSession(sessionFromBackendToken("admin", "admin@barbershop.com"));
    server.use(
      http.get("/auth/profile", () =>
        HttpResponse.json({ id: "usr_backend_1", email: "admin@barbershop.com", role: "admin" }),
      ),
    );

    renderApp({ initialEntries: ["/app/users"] });
    expect(
      await screen.findByRole("heading", { name: /usuarios/i }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("denies /app/users when the backend role is `barber`", async () => {
    seedSession(sessionFromBackendToken("barber", "joe@barbershop.com"));
    server.use(
      http.get("/auth/profile", () =>
        HttpResponse.json({ id: "usr_backend_2", email: "joe@barbershop.com", role: "barber" }),
      ),
    );

    renderApp({ initialEntries: ["/app/users"] });
    expect(
      await screen.findByText(/resumen del panel/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("hides role-gated nav entries for a `barber` session", async () => {
    seedSession(sessionFromBackendToken("barber", "joe@barbershop.com"));
    server.use(
      http.get("/auth/profile", () =>
        HttpResponse.json({ id: "usr_backend_2", email: "joe@barbershop.com", role: "barber" }),
      ),
    );

    renderApp({ initialEntries: ["/app/overview"] });

    // Un barbero conserva los módulos operativos…
    await screen.findByRole("link", { name: /dashboard/i }, { timeout: 3000 });
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /turnos/i })).toBeInTheDocument();
    // …pero no accede a la administración de usuarios.
    expect(screen.queryByRole("link", { name: /usuarios/i })).not.toBeInTheDocument();
  });

  it("denies every role-gated route when the backend role is unknown", async () => {
    seedSession(sessionFromBackendToken("superuser", "x@barbershop.com"));
    server.use(
      http.get("/auth/profile", () =>
        HttpResponse.json({ id: "usr_backend_3", email: "x@barbershop.com", role: "superuser" }),
      ),
    );

    renderApp({ initialEntries: ["/app/users"] });
    expect(
      await screen.findByText(/resumen del panel/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
