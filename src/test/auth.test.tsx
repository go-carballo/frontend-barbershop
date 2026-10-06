import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { normalizeRole } from "@/lib/rbac";
import { defaultSession } from "@/mocks/data";
import { server } from "@/test/server";
import { renderApp } from "@/test/test-app";
import type { Session } from "@/types";

const SESSION_KEY = "admin-dashboard-template:session";

const seedSession = (session: Session = defaultSession) =>
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

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
    await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 });

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
      await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(profileCalls).toBeGreaterThan(0);
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });

  it("signs the user out on boot when the stored token is expired", async () => {
    seedSession({ ...defaultSession, expiresAt: Date.now() - 1000 });

    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByText(/welcome back/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("clears the session and redirects to login on a 401, without refreshing", async () => {
    seedSession();
    let userCalls = 0;
    let refreshCalls = 0;
    server.use(
      http.get("/api/users", () => {
        userCalls += 1;
        return new HttpResponse(null, { status: 401 });
      }),
      http.post("/api/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json({ ...defaultSession, accessToken: "refreshed" });
      }),
    );

    renderApp({ initialEntries: ["/app/users"] });

    expect(await screen.findByText(/welcome back/i, {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(userCalls).toBe(1));
    expect(refreshCalls).toBe(0);
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
    await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 });

    await user.click(screen.getByRole("button", { name: /Avery Stone/i }));
    await user.click(await screen.findByRole("menuitem", { name: /logout/i }));

    expect(await screen.findByText(/welcome back/i, {}, { timeout: 3000 })).toBeInTheDocument();
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

    renderApp({ initialEntries: ["/app/billing"] });
    expect(
      await screen.findByRole("heading", { name: /plans, usage and invoices/i }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("denies /app/billing when the backend role is `barber`", async () => {
    seedSession(sessionFromBackendToken("barber", "joe@barbershop.com"));
    server.use(
      http.get("/auth/profile", () =>
        HttpResponse.json({ id: "usr_backend_2", email: "joe@barbershop.com", role: "barber" }),
      ),
    );

    renderApp({ initialEntries: ["/app/billing"] });
    expect(
      await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 }),
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

    // `barber` normalizes to Manager: it keeps the shared modules…
    await screen.findByRole("link", { name: /dashboard/i }, { timeout: 3000 });
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /turnos/i })).toBeInTheDocument();
    // …but loses the Owner/Admin-only barber and services entries.
    expect(screen.queryByRole("link", { name: /barberos/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /servicios/i })).not.toBeInTheDocument();
  });

  it("denies every role-gated route when the backend role is unknown", async () => {
    seedSession(sessionFromBackendToken("superuser", "x@barbershop.com"));
    server.use(
      http.get("/auth/profile", () =>
        HttpResponse.json({ id: "usr_backend_3", email: "x@barbershop.com", role: "superuser" }),
      ),
    );

    renderApp({ initialEntries: ["/app/billing"] });
    expect(
      await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
