import type { AppRole } from "@/types";

/**
 * Roles the real backend issues (`UserRole` enum in NestJS): `admin`, `barber`,
 * `receptionist`. They never match the template's `AppRole` vocabulary, so every
 * role that crosses the network boundary goes through `normalizeRole`.
 */
export const BACKEND_ROLES = ["admin", "barber", "receptionist"] as const;

export type BackendRole = (typeof BACKEND_ROLES)[number];

/**
 * Backend role -> `AppRole`. `admin` keeps the full admin surface, staff roles
 * collapse onto `Manager` (the least privileged role this template defines), and
 * the template roles themselves are accepted so demo/mock sessions keep working.
 * The `Record` key type makes the compiler complain if a backend role is added
 * without deciding what it means in the UI. Unknown roles resolve to `undefined`
 * and are therefore denied by `canAccess`.
 */
const ROLE_ALIASES: Record<BackendRole | "owner" | "manager", AppRole> = {
  admin: "Admin",
  owner: "Owner",
  manager: "Manager",
  barber: "Manager",
  receptionist: "Manager",
};

/** Lookup view of `ROLE_ALIASES`, so an arbitrary string can be indexed safely. */
const ROLE_LOOKUP: Readonly<Record<string, AppRole | undefined>> = ROLE_ALIASES;

/** Maps any role string (backend or template) to the `AppRole` the UI gates on. */
export const normalizeRole = (value: unknown): AppRole | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  return ROLE_LOOKUP[value.trim().toLowerCase()];
};

export const canAccess = (role: AppRole | undefined, allowed?: readonly AppRole[]): boolean =>
  !allowed || allowed.length === 0 || (role !== undefined && allowed.includes(role));
