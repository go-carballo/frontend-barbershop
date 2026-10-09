import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import { defaultSession } from "@/mocks/data";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { renderApp } from "@/test/test-app";

// The dashboard reads the real BarberShop endpoints, so landing on
// /app/overview needs backend-shaped responses for them.
beforeEach(() => useOverviewFixture());

describe("app routing", () => {
  it("renders user settings and persists the selected theme", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));

    renderApp({ initialEntries: ["/app/settings/user"] });

    await screen.findByRole("heading", { name: /personalize your experience/i });
    const midnightOption = screen.getByRole("radio", { name: /midnight ops/i });
    await user.click(midnightOption);

    await waitFor(() => {
      expect(midnightOption).toBeChecked();
      expect(document.documentElement.dataset.theme).toBe("midnight-ops");
      expect(window.localStorage.getItem("admin-dashboard-theme")).toBe("midnight-ops");
    });
  });

  it("redirects protected routes to login when there is no session", async () => {
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
  });

  it("renders a skip link for authenticated routes", async () => {
    // Warm the lazy route module so the assertion does not race the chunk load.
    await import("@/pages/overview-page");
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));

    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("link", { name: /skip to main content/i })).toBeInTheDocument();
  });

  it("logs in and reaches the overview page", async () => {
    const user = userEvent.setup();
    renderApp({ initialEntries: ["/login"] });

    await user.click(screen.getByRole("button", { name: /continue as avery stone/i }));

    expect(
      await screen.findByText(/resumen del panel/i, {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("renders the BarberShop dashboard modules for an authenticated session", async () => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));

    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("heading", { name: /turnos por mes/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /próximos turnos/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /actividad reciente/i })).toBeInTheDocument();
  });

  it("renders the users table for an authenticated session", async () => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));

    renderApp({ initialEntries: ["/app/users"] });

    expect(await screen.findByText(/access control and roster visibility/i)).toBeInTheDocument();
    expect((await screen.findAllByText("Jules Carter")).length).toBeGreaterThan(0);
    expect(await screen.findByRole("searchbox", { name: /search users/i })).toBeInTheDocument();
    expect(
      (await screen.findAllByRole("button", { name: /open actions for avery stone/i })).length,
    ).toBeGreaterThan(0);
  });

  it("loads settings and submits the form", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));

    renderApp({ initialEntries: ["/app/settings"] });

    const companyName = await screen.findByLabelText(/company name/i);
    await user.clear(companyName);
    await user.type(companyName, "Northstar Labs");
    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByText(/settings updated/i)).toBeInTheDocument();
    });
  });
});
