import { http } from "@/lib/http";
import type { Session } from "@/types";

const SESSION_STORAGE_KEY = "admin-dashboard-template:session";
const REMEMBERED_USER_STORAGE_KEY = "admin-dashboard-template:last-user";

export type LoginMethod = "password" | "google" | "apple";

export type LoginPayload = {
  /** Kept for the OAuth UI flow; it is never sent to the backend. */
  method?: LoginMethod;
  email?: string;
  password?: string;
};

export type LoginResponse = {
  access_token: string;
};

export type RememberedUser = {
  name: string;
  email: string;
};

export const authStorage = {
  get: () => {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  },
  set: (session: Session) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  },
  clear: () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  },
};

export const rememberedUserStorage = {
  get: (): RememberedUser | null => {
    const raw = window.localStorage.getItem(REMEMBERED_USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<RememberedUser>;
      if (typeof parsed.name === "string" && typeof parsed.email === "string") {
        return { name: parsed.name, email: parsed.email };
      }
      return null;
    } catch {
      return null;
    }
  },
  set: (user: RememberedUser) => {
    window.localStorage.setItem(REMEMBERED_USER_STORAGE_KEY, JSON.stringify(user));
  },
  clear: () => {
    window.localStorage.removeItem(REMEMBERED_USER_STORAGE_KEY);
  },
};

export const demoPersona: RememberedUser = {
  name: "Avery Stone",
  email: "avery@northstar.app",
};

/**
 * The backend only issues `{ access_token }`, so the session is rebuilt from the
 * claims that really exist in the JWT: `sub`, `email`, `role` and `exp`.
 * `name` and `organization` stay empty until the backend exposes them.
 */
const decodeJwtClaims = (token: string): Record<string, unknown> => {
  const segment = token.split(".")[1];
  if (!segment) {
    return {};
  }
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const sessionFromToken = (accessToken: string): Session => {
  const claims = decodeJwtClaims(accessToken);
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  const email = typeof claims.email === "string" ? claims.email : "";
  const role = typeof claims.role === "string" ? claims.role : "";
  const exp = typeof claims.exp === "number" ? claims.exp : 0;

  return {
    user: {
      id: sub,
      name: "",
      email,
      role: role as Session["user"]["role"],
      organization: "",
    },
    isAuthenticated: true,
    accessToken,
    expiresAt: exp * 1000,
  };
};

export const loginRequest = (payload: LoginPayload = {}) =>
  http<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  }).then(({ access_token }) => {
    if (!access_token) {
      throw new Error("Login response did not include an access token");
    }
    return sessionFromToken(access_token);
  });

export const logoutRequest = () =>
  http<{ success: boolean }>("/api/auth/logout", { method: "POST" });

export const refreshRequest = () => http<Session>("/api/auth/refresh", { method: "POST" });

export const isSessionExpired = (session: Session | null): boolean => {
  if (!session) {
    return true;
  }
  return session.expiresAt <= Date.now();
};
