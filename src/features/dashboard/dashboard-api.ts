import { http } from "@/lib/http";

export interface StatusCount {
  status: string;
  total: number;
}

export interface ServiceBreakdown {
  serviceName: string;
  total: number;
  revenue: number;
}

export interface DashboardStats {
  todayAppointments: number;
  upcomingAppointments: number;
  estimatedRevenue: number;
  statusCounts: StatusCount[];
  serviceBreakdown: ServiceBreakdown[];
}

/** Fetch dashboard stats. Barber role filters by own appointments, admin/receptionist sees all. */
export const getDashboardStatsRequest = (signal?: AbortSignal) =>
  http<DashboardStats>("/appointments/dashboard/stats", { signal });
