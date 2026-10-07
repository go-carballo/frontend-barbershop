import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { navLeafItems, resolveNavTrail } from "@/components/layout/nav-items";
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

const seed = (session: Session = defaultSession) =>
  window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(session));

describe("navigation information architecture", () => {
  it("exposes leaf items for search regardless of nesting", () => {
    const hrefs = navLeafItems.map((item) => item.href);
    expect(hrefs).toContain("/app/users");
    expect(hrefs).toContain("/app/customers");
    expect(hrefs).toContain("/app/barbers");
    expect(hrefs).toContain("/app/services");
    expect(hrefs).toContain("/app/appointments");
    expect(hrefs).not.toContain(undefined);
  });

  it("resolves trails through the BarberShop management section", () => {
    const trail = resolveNavTrail("/app/barbers");
    expect(trail?.group.label).toBe("nav.group.management");
    expect(trail?.item.title).toBe("nav.barbers");
    expect(trail?.child).toBeUndefined();
  });

  it("keeps demo routes out of the main navigation", () => {
    expect(resolveNavTrail("/app/settings/user")).toBeUndefined();
    expect(resolveNavTrail("/app/analytics")).toBeUndefined();
  });

  it("shows only the BarberShop navigation modules", async () => {
    seed();
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toHaveAttribute(
      "href",
      "/app/customers",
    );
    expect(screen.getByRole("link", { name: /barberos/i })).toHaveAttribute("href", "/app/barbers");
    expect(screen.getByRole("link", { name: /servicios/i })).toHaveAttribute(
      "href",
      "/app/services",
    );
    expect(screen.getByRole("link", { name: /turnos/i })).toHaveAttribute(
      "href",
      "/app/appointments",
    );
    expect(screen.queryByRole("link", { name: /analytics/i })).not.toBeInTheDocument();
  });

  it("preserves role filtering for management modules", async () => {
    seed(barberSession);
    renderApp({ initialEntries: ["/app/overview"] });

    expect(await screen.findByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /clientes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /barberos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /servicios/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /users/i })).not.toBeInTheDocument();
  });

  it("renders breadcrumbs for management routes with the current page last", async () => {
    seed();
    renderApp({ initialEntries: ["/app/barbers"] });

    const breadcrumb = await screen.findByRole("navigation", { name: /breadcrumb/i });
    const items = within(breadcrumb).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/gestión/i);
    expect(within(items[1]).getByText(/barberos/i)).toHaveAttribute("aria-current", "page");
  });

  it("renders two-level breadcrumbs for flat pages", async () => {
    seed();
    renderApp({ initialEntries: ["/app/overview"] });

    const breadcrumb = await screen.findByRole("navigation", { name: /breadcrumb/i });
    const items = within(breadcrumb).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[1]).getByText(/dashboard/i)).toHaveAttribute("aria-current", "page");
  });
});
