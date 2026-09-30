export const readApiBaseUrl = () => (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

const API_BASE_URL = readApiBaseUrl();

/**
 * True when the app points at a real backend (`VITE_API_BASE_URL` is set).
 * Read on every call so tests can stub the env before rendering the login page.
 */
export const isBackendConfigured = () => readApiBaseUrl() !== "";

/**
 * Routes that must always reach the real backend, even while the rest of the app
 * still runs on the MSW demo layer.
 *
 * Hybrid mode: `VITE_API_BASE_URL` is applied *only* to these paths. Every other
 * request stays relative, and because MSW matches relative handler paths against
 * the app origin, it keeps serving the template data locally instead of leaking
 * demo traffic to NestJS.
 *
 * Migrating an endpoint to the real API is a one-line change here.
 */
export const REAL_API_ROUTES = ["/auth/login"] as const;

const isRealApiRoute = (path: string) =>
  REAL_API_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));

let activeTenantId: string | null = null;
let getAccessToken: (() => string | null) | null = null;
let refreshAuthSession: (() => Promise<boolean>) | null = null;
let onUnauthorized: (() => void) | null = null;

export const setActiveTenantId = (id: string | null) => {
  activeTenantId = id;
};

export const setHttpAuth = (handlers: {
  getToken: () => string | null;
  refresh: () => Promise<boolean>;
  unauthorized: () => void;
}) => {
  getAccessToken = handlers.getToken;
  refreshAuthSession = handlers.refresh;
  onUnauthorized = handlers.unauthorized;
};

/**
 * Thrown for a non-2xx response. `detail` carries the backend's own message so
 * callers can surface it instead of a generic string.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, detail?: string, fallback = `Request failed with status ${status}`) {
    super(detail ?? fallback);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
  }
}

/** Reads `{ message: string | string[] }` bodies; `undefined` when nothing usable. */
const readErrorMessage = async (response: Response): Promise<string | undefined> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return undefined;
  }
  const message = (body as { message?: unknown } | null | undefined)?.message;
  if (typeof message === "string") {
    return message.trim() || undefined;
  }
  if (Array.isArray(message)) {
    const parts = message.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
  return undefined;
};

const resolveUrl = (input: RequestInfo | URL): RequestInfo | URL => {
  // Relative inputs stay relative on purpose: MSW matches them against the app
  // origin, so only the routes in REAL_API_ROUTES ever leave for the backend.
  if (
    API_BASE_URL &&
    typeof input === "string" &&
    !/^https?:\/\//.test(input) &&
    isRealApiRoute(input)
  ) {
    return `${API_BASE_URL}${input.startsWith("/") ? "" : "/"}${input}`;
  }
  return input;
};

export const http = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  retried = false,
): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getAccessToken?.();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (activeTenantId) {
    headers["X-Tenant-Id"] = activeTenantId;
  }

  const requestHeaders = new Headers(headers);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      requestHeaders.set(key, value);
    });
  }

  const response = await fetch(resolveUrl(input), {
    ...init,
    headers: requestHeaders,
  });

  if (response.ok) {
    return response.json() as Promise<T>;
  }

  // Only worth refreshing when we actually sent a token. A failed login has no
  // token yet, so its backend message must reach the caller untouched.
  if (response.status === 401 && !retried && token && refreshAuthSession) {
    const refreshed = await refreshAuthSession();
    if (refreshed) {
      return http<T>(input, init, true);
    }
    onUnauthorized?.();
    throw new HttpError(401, await readErrorMessage(response), "Session expired");
  }

  throw new HttpError(response.status, await readErrorMessage(response));
};
