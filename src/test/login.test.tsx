import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, vi } from "vitest";
import { defaultAccessToken } from "@/mocks/data";
import { server } from "@/test/server";
import { renderApp } from "@/test/test-app";

const REMEMBERED_KEY = "admin-dashboard-template:last-user";

const rememberAlex = () =>
  window.localStorage.setItem(
    REMEMBERED_KEY,
    JSON.stringify({ name: "Alex Chen", email: "alex.chen@company.com" }),
  );

describe("login screen", () => {
  it("falls back to the demo persona when no account is remembered", async () => {
    renderApp({ initialEntries: ["/login"] });

    expect(
      await screen.findByRole("button", { name: /continue as avery stone/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("avery@northstar.app")).toBeInTheDocument();
  });

  it("renders the remembered account from local storage", async () => {
    rememberAlex();
    renderApp({ initialEntries: ["/login"] });

    expect(
      await screen.findByRole("button", { name: /continue as alex chen/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("alex.chen@company.com")).toBeInTheDocument();
  });

  it("signs in through the remembered account and reaches the overview", async () => {
    const user = userEvent.setup();
    renderApp({ initialEntries: ["/login"] });

    await user.click(await screen.findByRole("button", { name: /continue as avery stone/i }));

    expect(
      await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("honors the redirect target carried by protected routes", async () => {
    const user = userEvent.setup();
    renderApp({ initialEntries: ["/app/users"] });

    await user.click(await screen.findByRole("button", { name: /continue as avery stone/i }));

    expect(
      await screen.findByText(/access control and roster visibility/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("switches to the password form, validates input and signs in", async () => {
    const user = userEvent.setup();
    rememberAlex();
    renderApp({ initialEntries: ["/login"] });

    await user.click(await screen.findByRole("button", { name: /switch or remove account/i }));

    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/enter your email address\.?/i)).toBeInTheDocument();

    const email = screen.getByLabelText(/email/i);
    const password = screen.getByLabelText(/password/i);
    await user.type(email, "not-an-email");
    await user.type(password, "short");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(await screen.findByText(/enter a valid email address\.?/i)).toBeInTheDocument();

    await user.clear(email);
    await user.type(email, "alex@company.com");
    await user.clear(password);
    await user.type(password, "supersecret");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));
    expect(
      await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("removes the saved account and pins the password form", async () => {
    const user = userEvent.setup();
    rememberAlex();
    renderApp({ initialEntries: ["/login"] });

    await user.click(await screen.findByRole("button", { name: /switch or remove account/i }));
    await user.click(screen.getByRole("button", { name: /remove saved account/i }));

    expect(window.localStorage.getItem(REMEMBERED_KEY)).toBeNull();
    expect(screen.queryByRole("button", { name: /use saved account/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue as/i })).not.toBeInTheDocument();
  });

  it("does not forward the provider method to the backend", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/auth/login", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ access_token: defaultAccessToken });
      }),
    );
    const user = userEvent.setup();
    renderApp({ initialEntries: ["/login"] });

    await user.click(await screen.findByRole("button", { name: /google/i }));

    expect(body).not.toHaveProperty("method");
    expect(
      await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});

describe("login screen against a configured backend", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const renderWithBackend = () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
    return renderApp({ initialEntries: ["/login"] });
  };

  const fillCredentials = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(await screen.findByLabelText(/email/i), "admin@barbershop.com");
    await user.type(screen.getByLabelText(/password/i), "Admin123!!");
  };

  it("opens directly on the email/password form", async () => {
    rememberAlex();
    renderWithBackend();

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue as/i })).not.toBeInTheDocument();
  });

  it("sends exactly email and password to the backend", async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post("/auth/login", async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ access_token: defaultAccessToken });
      }),
    );
    const user = userEvent.setup();
    renderWithBackend();

    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(body).toEqual({ email: "admin@barbershop.com", password: "Admin123!!" });
    expect(
      await screen.findByText(/dashboard overview/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("joins an array of backend validation messages", async () => {
    server.use(
      http.post("/auth/login", () =>
        HttpResponse.json(
          {
            message: ["password should not be empty", "password must be a string"],
            error: "Bad Request",
            statusCode: 400,
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithBackend();

    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText(
        "password should not be empty, password must be a string",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });

  it("shows a single backend message as-is", async () => {
    server.use(
      http.post("/auth/login", () =>
        HttpResponse.json(
          { message: "Invalid credentials", error: "Unauthorized", statusCode: 401 },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithBackend();

    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText("Invalid credentials", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("falls back to a generic message when the backend sends nothing usable", async () => {
    server.use(http.post("/auth/login", () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup();
    renderWithBackend();

    await fillCredentials(user);
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(
      await screen.findByText(/we couldn't sign you in\.?/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
