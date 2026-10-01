import { http } from "@/lib/http";
import { normalizeRole } from "@/lib/rbac";
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

/** `GET /auth/profile` returns the JWT claims as a user object. */
export type ProfileResponse = {
  id: string;
  email: string;
  role: string;
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
  const role = normalizeRole(claims.role);
  const exp = typeof claims.exp === "number" ? claims.exp : 0;

  return {
    user: {
      id: sub,
      name: "",
      email,
      role,
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

/**
 * The only session-introspection endpoint the backend exposes. Used on boot to
 * re-hydrate the session from a stored token, and to confirm the token is still
 * accepted before the user is trusted.
 */
export const profileRequest = () => http<ProfileResponse>("/auth/profile");

/**
 * Merges the profile returned by `GET /auth/profile` into an existing session.
 * The backend only exposes `id`, `email` and `role`, so `name`/`organization`
 * keep whatever the token already carried.
 */
export const mergeProfile = (session: Session, profile: ProfileResponse): Session => ({
  ...session,
  user: {
    ...session.user,
    id: profile.id || session.user.id,
    email: profile.email || session.user.email,
    role: normalizeRole(profile.role) ?? session.user.role,
  },
});

export const isSessionExpired = (session: Session | null): boolean => {
  if (!session) {
    return true;
  }
  return session.expiresAt <= Date.now();
};
