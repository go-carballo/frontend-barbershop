import { http, passthrough } from "msw";
import { setupWorker } from "msw/browser";
import { REAL_API_ROUTES, readApiBaseUrl } from "@/lib/http";
import { handlers } from "@/mocks/handlers";

const apiBaseUrl = readApiBaseUrl();

/**
 * Real backend routes are registered as `passthrough()` so MSW hands them back to
 * the network untouched. Registering them first guarantees a leftover demo
 * handler (e.g. the mock `POST /auth/login`) can never shadow NestJS, even if the
 * SPA and the API end up sharing an origin behind a proxy.
 */
const realApiHandlers = apiBaseUrl
  ? REAL_API_ROUTES.map((route) => http.all(`${apiBaseUrl}${route}`, () => passthrough()))
  : [];

// Demo handlers come last. Anything they do not cover falls through to the
// network (`onUnhandledRequest: "bypass"` in `main.tsx`).
export const worker = setupWorker(...realApiHandlers, ...handlers);
