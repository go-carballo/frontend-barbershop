import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSession } from "@/mocks/data";
import { makeAppointment, useAppointmentsFixture } from "@/test/appointments-fixtures";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { renderApp } from "@/test/test-app";

// The dashboard reads the real BarberShop endpoints, so landing on
// /app/overview needs backend-shaped responses for them.
beforeEach(() => useOverviewFixture());

// jsdom signals belong to a different realm than Node fetch, so React Query
// AbortSignals crash MSW's Request inside the test environment.
vi.mock("@/features/appointments/appointments-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/appointments/appointments-api")>();
  return {
    ...api,
    getAppointmentsRequest: (
      params: import("@/features/appointments/appointments-api").AppointmentListParams,
    ) => api.getAppointmentsRequest(params),
    getAppointmentRequest: (id: string) => api.getAppointmentRequest(id),
  };
});
vi.mock("@/features/customers/customers-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/customers/customers-api")>();
  return {
    ...api,
    getCustomersRequest: (params: import("@/features/customers/customers-api").CustomersParams) =>
      api.getCustomersRequest(params),
  };
});
vi.mock("@/features/barbers/barbers-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/barbers/barbers-api")>();
  return {
    ...api,
    getBarbersRequest: (params: import("@/features/barbers/barbers-api").BarbersParams) =>
      api.getBarbersRequest(params),
  };
});
vi.mock("@/features/services/services-api", async (importOriginal) => {
  const api = await importOriginal<typeof import("@/features/services/services-api")>();
  return {
    ...api,
    getServicesRequest: (params: import("@/features/services/services-api").ServicesParams) =>
      api.getServicesRequest(params),
  };
});

const seedSession = () => {
  window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
};

describe("accessibility", () => {
  it("login page has no detectable violations in the remembered-account mode", async () => {
    window.localStorage.setItem(
      "admin-dashboard-template:last-user",
      JSON.stringify({ name: "Alex Chen", email: "alex.chen@company.com" }),
    );
    const { container } = renderApp({ initialEntries: ["/login"] });
    expect(
      await screen.findByRole("button", { name: /continue as alex chen/i }),
    ).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("login page has no detectable violations in the password mode", async () => {
    const user = userEvent.setup();
    const { container } = renderApp({ initialEntries: ["/login"] });
    await user.click(await screen.findByRole("button", { name: /switch or remove account/i }));
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("overview page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/overview"] });
    await waitFor(() => expect(screen.getByText(/resumen del panel/i)).toBeInTheDocument());
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("users page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/users"] });
    await screen.findByRole("searchbox", { name: /search users/i });
    await waitFor(() =>
      expect(screen.getByText(/access control and roster visibility/i)).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText(/avery stone/i)).toBeInTheDocument());
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("transactions page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/transactions"] });
    await screen.findByRole("searchbox", { name: /search transactions/i });
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("settings page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/settings"] });
    await waitFor(() =>
      expect(screen.getByText(/workspace settings without the visual noise/i)).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByLabelText(/company name/i)).toBeInTheDocument());
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("user settings page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/settings/user"] });
    expect(
      await screen.findByRole("heading", { name: /personalize your experience/i }),
    ).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("mail page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/mail"] });
    await screen.findByRole("heading", { name: /inbox/i, level: 1 });
    await screen.findByText(/your scale plan renews/i);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("appointments page has no detectable violations", async () => {
    seedSession();
    useAppointmentsFixture([makeAppointment()]);
    const { container } = renderApp({ initialEntries: ["/app/appointments"] });
    // Scoped to the table: the customer filter dropdown also lists the name.
    await within(await screen.findByRole("table")).findByText("Ana Pérez");
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("profile page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/profile"] });
    await screen.findByText(/avery@northstar\.app/i);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("ui kit page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/ui"] });
    await screen.findByRole("heading", { name: /color tokens/i });
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("data tables page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/data/tables"] });
    await screen.findByText(/granite ops/i);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("data charts page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/data/charts"] });
    await screen.findByRole("heading", { name: /area — monthly revenue/i });
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("notifications page has no detectable violations", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/notifications"] });
    await waitFor(() =>
      expect(screen.getByText(/alerts and in-app messages/i)).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: /loading list/i }) ?? screen.getByText(/alerts and/i),
      ).toBeInTheDocument(),
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
