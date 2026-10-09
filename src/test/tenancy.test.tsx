import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { TENANT_STORAGE_KEY } from "@/features/tenants/tenant-context";
import { defaultSession } from "@/mocks/data";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { server } from "@/test/server";
import { renderApp } from "@/test/test-app";

// The dashboard reads the real BarberShop endpoints, so landing on
// /app/overview needs backend-shaped responses for them.
beforeEach(() => useOverviewFixture());

describe("multi-tenancy", () => {
  it("switches the active workspace and persists the choice", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    window.localStorage.removeItem(TENANT_STORAGE_KEY);
    renderApp({ initialEntries: ["/app/overview"] });

    await screen.findByText(/resumen del panel/i, {}, { timeout: 3000 });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /switch workspace/i })).toBeEnabled(),
    );

    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: /aurora labs/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(TENANT_STORAGE_KEY)).toBe('"tn_aurora"');
    });
    expect(screen.getByRole("button", { name: /switch workspace/i })).toBeInTheDocument();
  });

  it("scopes API requests with the X-Tenant-Id header", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    window.localStorage.setItem(TENANT_STORAGE_KEY, '"tn_aurora"');

    let captured: string | null = null;
    server.use(
      http.get("/api/users", ({ request }) => {
        captured = request.headers.get("X-Tenant-Id");
        return HttpResponse.json([]);
      }),
    );

    renderApp({ initialEntries: ["/app/users"] });
    await screen.findByText(/access control and roster visibility/i, {}, { timeout: 3000 });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /switch workspace/i })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: /switch workspace/i }));
    await user.click(await screen.findByRole("menuitemradio", { name: /northstar/i }));

    await waitFor(() => expect(captured).toBe("tn_northstar"));
  });
});
