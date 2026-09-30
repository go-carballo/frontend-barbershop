import { HttpResponse, http as mswHttp } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAccessToken } from "@/mocks/data";
import { server } from "@/test/server";

/**
 * Hybrid mode contract: `VITE_API_BASE_URL` is applied only to the routes in
 * `REAL_API_ROUTES`. Everything else stays relative so MSW keeps serving the
 * template data, and real endpoints never hit a mock handler.
 *
 * A host distinct from the jsdom origin (`localhost:3000`) is used as the fake
 * backend so the assertions can tell the two origins apart.
 *
 * `@/lib/http` captures the base URL at module load, so each case re-imports it
 * with the env stubbed in place.
 */
const BACKEND = "http://nest.internal";

const loadHttpWithBaseUrl = async (baseUrl: string) => {
  vi.stubEnv("VITE_API_BASE_URL", baseUrl);
  vi.resetModules();
  return import("@/lib/http");
};

const hostOf = (url: string) => new URL(url).host;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  server.resetHandlers();
});

describe("hybrid mock/real routing", () => {
  it("sends real API routes to the configured backend", async () => {
    const { http } = await loadHttpWithBaseUrl(BACKEND);
    let seenUrl = "";
    server.use(
      mswHttp.post(`${BACKEND}/auth/login`, async ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ access_token: "real-token" });
      }),
    );

    await http("/auth/login", { method: "POST", body: "{}" });

    // Only an absolute-URL handler can match here, so the route was prefixed.
    expect(seenUrl).toBe(`${BACKEND}/auth/login`);
  });

  it("keeps demo routes relative so MSW still serves them", async () => {
    const { http } = await loadHttpWithBaseUrl(BACKEND);
    let seenUrl = "";
    server.use(
      mswHttp.get("/api/dashboard/overview", ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ kpis: [] });
      }),
    );

    await http("/api/dashboard/overview");

    // Reaching this relative handler proves the path was resolved against the
    // app origin instead of being sent to the backend.
    expect(hostOf(seenUrl)).not.toBe("nest.internal");
  });

  it("leaves real routes relative when no backend is configured", async () => {
    const { http, isBackendConfigured } = await loadHttpWithBaseUrl("");
    let seenUrl = "";
    server.use(
      mswHttp.post("/auth/login", ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({ access_token: defaultAccessToken });
      }),
    );

    await http("/auth/login", { method: "POST", body: "{}" });

    expect(isBackendConfigured()).toBe(false);
    expect(hostOf(seenUrl)).not.toBe("nest.internal");
  });
});
