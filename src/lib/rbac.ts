import type { AppRole } from "@/types";

export const BACKEND_ROLES = ["admin", "barber", "receptionist"] as const;

export type BackendRole = (typeof BACKEND_ROLES)[number];

const ROLE_LOOKUP: Readonly<Record<BackendRole, AppRole>> = {
  admin: "admin",
  barber: "barber",
  receptionist: "receptionist",
};

/** Accepts only roles emitted by the backend; unknown roles are denied. */
export const normalizeRole = (value: unknown): AppRole | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  return ROLE_LOOKUP[value.trim().toLowerCase() as BackendRole];
};

export const canAccess = (role: AppRole | undefined, allowed?: readonly AppRole[]): boolean =>
  !allowed || allowed.length === 0 || (role !== undefined && allowed.includes(role));
