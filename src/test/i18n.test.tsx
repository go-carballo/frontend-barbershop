import { screen } from "@testing-library/react";
import i18n from "@/features/i18n/i18n";
import { defaultSession } from "@/mocks/data";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { renderApp } from "@/test/test-app";

// The dashboard reads the real BarberShop endpoints, so landing on
// /app/overview needs backend-shaped responses for them.
beforeEach(() => useOverviewFixture());

describe("internationalization", () => {
  it("renders nav labels in English by default", async () => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    renderApp({ initialEntries: ["/app/overview"] });
    const labels = await screen.findAllByText("Dashboard", {}, { timeout: 3000 });
    expect(labels.length).toBeGreaterThan(0);
  });

  it("switches visible UI strings to Spanish", async () => {
    window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));
    renderApp({ initialEntries: ["/app/overview"] });
    await screen.findAllByText("Dashboard", {}, { timeout: 3000 });

    await i18n.changeLanguage("es");

    const labels = await screen.findAllByText("Resumen");
    expect(labels.length).toBeGreaterThan(0);
    expect(
      await screen.findByRole("link", { name: /saltar al contenido principal/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Skip to main content")).not.toBeInTheDocument();
  });
});
