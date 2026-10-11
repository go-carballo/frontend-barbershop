import { HttpResponse, http } from "msw";
import { barbershopDemoHandlers } from "@/mocks/barbershop-handlers";
import { defaultAccessToken, usersPayload } from "@/mocks/data";
import type { Session, UserRecord } from "@/types";

export const resetMockState = () => undefined;

export const handlers = [
  ...barbershopDemoHandlers,
  http.post("/auth/login", () => HttpResponse.json({ access_token: defaultAccessToken })),
  http.get("/auth/profile", () => {
    const raw = window.localStorage.getItem("admin-dashboard-template:session");
    const stored = raw ? (JSON.parse(raw) as Session) : null;
    if (!stored?.accessToken)
      return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
    return HttpResponse.json({
      id: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });
  }),
  http.get("*/users", () => HttpResponse.json(usersPayload)),
  http.post("*/users", async ({ request }) => {
    const body = (await request.json()) as Omit<UserRecord, "id" | "createdAt" | "updatedAt">;
    const user: UserRecord = {
      ...body,
      id: `usr_${usersPayload.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    usersPayload.push(user);
    return HttpResponse.json(user, { status: 201 });
  }),
];
