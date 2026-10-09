import { http } from "@/lib/http";

/**
 * Demo payload for the template's chart gallery (`/app/data/charts`), served by
 * the `/api/dashboard/overview` MSW handler in pure-mock mode. The BarberShop
 * dashboard no longer consumes this endpoint: it reads the real appointments
 * and directory APIs instead.
 */
export type OverviewChartPoint = {
  name: string;
  revenue: number;
  activeUsers: number;
};

export type OverviewChartPayload = {
  chart: OverviewChartPoint[];
};

export const getOverviewRequest = () => http<OverviewChartPayload>("/api/dashboard/overview");
