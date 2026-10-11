import type { Session, UserRecord } from "@/types";

export const defaultSession: Session = {
  user: {
    id: "usr_admin_001",
    name: "Administrador",
    email: "admin@barbershop.com",
    role: "admin",
    organization: "BarberShop",
  },
  isAuthenticated: true,
  accessToken: "mock-access-token",
  expiresAt: 4102444800000,
};

export const defaultAccessToken = [
  btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=+$/, ""),
  btoa(
    JSON.stringify({
      sub: defaultSession.user.id,
      email: defaultSession.user.email,
      role: defaultSession.user.role,
      exp: Math.floor(defaultSession.expiresAt / 1000),
    }),
  ).replace(/=+$/, ""),
  "mock-signature",
].join(".");

export const usersPayload: UserRecord[] = [
  {
    id: defaultSession.user.id,
    name: defaultSession.user.name,
    email: defaultSession.user.email,
    role: "admin",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];
