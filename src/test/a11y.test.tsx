import { screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it } from "vitest";
import { defaultSession } from "@/mocks/data";
import { makeAppointment, useAppointmentsFixture } from "@/test/appointments-fixtures";
import { useOverviewFixture } from "@/test/overview-fixtures";
import { renderApp } from "@/test/test-app";

beforeEach(() => useOverviewFixture());
const seedSession = () =>
  window.localStorage.setItem("admin-dashboard-template:session", JSON.stringify(defaultSession));

describe("accesibilidad", () => {
  it("no detecta problemas en el inicio de sesión", async () => {
    const { container } = renderApp({ initialEntries: ["/login"] });
    await screen.findByRole("heading");
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("no detecta problemas en el panel", async () => {
    seedSession();
    const { container } = renderApp({ initialEntries: ["/app/overview"] });
    await screen.findByRole("heading", { name: /turnos por mes/i });
    expect((await axe(container)).violations).toHaveLength(0);
  });

  it("no detecta problemas en turnos", async () => {
    seedSession();
    useAppointmentsFixture([makeAppointment()]);
    const { container } = renderApp({ initialEntries: ["/app/appointments"] });
    await within(await screen.findByRole("table")).findByText("Ana Pérez");
    expect((await axe(container)).violations).toHaveLength(0);
  });
});
