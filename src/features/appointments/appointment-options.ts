import { useQuery } from "@tanstack/react-query";
import { getBarbersRequest } from "@/features/barbers/barbers-api";
import { getCustomersRequest } from "@/features/customers/customers-api";
import { getServicesRequest } from "@/features/services/services-api";

export type AppointmentOptions = {
  customers: Awaited<ReturnType<typeof getCustomersRequest>>["data"];
  barbers: Awaited<ReturnType<typeof getBarbersRequest>>["data"];
  services: Awaited<ReturnType<typeof getServicesRequest>>["data"];
};

export const appointmentOptionsKeys = {
  all: (userId: string) => ["appointment-options", userId] as const,
};

/**
 * Active customers, barbers and services used by the appointment filters and by
 * the create/edit form. Only active records are loaded because the backend
 * rejects an appointment that references an inactive resource (409), and only
 * `perPage=100` is requested while the current volume fits in one page.
 */
export const useAppointmentOptions = (userId: string, enabled = true) =>
  useQuery({
    queryKey: appointmentOptionsKeys.all(userId),
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const [customers, barbers, services] = await Promise.all([
        getCustomersRequest({ page: 1, perPage: 100, isActive: "true" }, signal),
        getBarbersRequest({ page: 1, perPage: 100, isActive: "true" }, signal),
        getServicesRequest({ page: 1, perPage: 100, isActive: "true" }, signal),
      ]);
      return { customers: customers.data, barbers: barbers.data, services: services.data };
    },
  });
