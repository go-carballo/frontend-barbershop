import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NotificationItem } from "./notifications-api";

export type { NotificationItem };

import {
  getNotificationsRequest,
  getUnreadCountRequest,
  markNotificationAsReadRequest,
  notificationsKeys,
} from "./notifications-api";

/**
 * Target types the backend supports for notifications queries.
 * `user` = logged-in user (admin), `customer` or `barber` = other entities.
 */
export type NotificationTargetType = "user" | "customer" | "barber";

/* ---- Hooks ---- */

/**
 * Paginated list of notifications for the current user.
 * (The auth layer currently only supports user-level roles; targetType
 *  "user" maps directly to `request.user.id` on the backend.)
 */
export const useNotifications = (targetId: string, page = 1, perPage = 20) =>
  useQuery({
    queryKey: notificationsKeys.list("user", targetId),
    queryFn: ({ signal }) => getNotificationsRequest("user", targetId, page, perPage, signal),
    staleTime: 30_000,
    enabled: targetId !== "",
  });

/** Unread count for the current user. */
export const useUnreadCount = (targetId: string) =>
  useQuery({
    queryKey: notificationsKeys.unreadCount("user", targetId),
    queryFn: ({ signal }) => getUnreadCountRequest("user", targetId, signal),
    staleTime: 10_000,
    enabled: targetId !== "",
  });

/**
 * Mutation to mark a notification as read.
 * Optimistically updates the UI and invalidates all relevant queries.
 */
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsReadRequest(notificationId),
    onMutate: async (notificationId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: notificationsKeys.list("user", ""),
      });
      await queryClient.cancelQueries({
        queryKey: notificationsKeys.unreadCount("user", ""),
      });

      // Snapshot the current cache
      const previousList = queryClient.getQueryData<unknown>(notificationsKeys.list("user", ""));
      const previousCount = queryClient.getQueryData<unknown>(
        notificationsKeys.unreadCount("user", ""),
      );

      // Optimistic update: mark read in the list
      queryClient.setQueryData(notificationsKeys.list("user", ""), (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const list = old as { data?: NotificationItem[] };
        if (!list?.data) return old;
        return {
          ...list,
          data: list.data.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        };
      });

      // Optimistic update: decrement the count
      queryClient.setQueryData(notificationsKeys.unreadCount("user", ""), (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const count = (old as { count?: number }).count ?? 0;
        return { count: Math.max(0, count - 1) };
      });

      return { previousList, previousCount };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(notificationsKeys.list("user", ""), context.previousList);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(notificationsKeys.unreadCount("user", ""), context.previousCount);
      }
    },
    onSettled: () => {
      // Refetch all notification queries
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    },
  });
};

/* ---- Toast listener (for real-time in-app toasts) ---- */

/**
 * Call this whenever an appointment changes to refresh notification queries.
 * (WebSockets would replace this polling pattern in a production system.)
 */
export const useNotificationToast = (targetId: string) => {
  const queryClient = useQueryClient();

  const handleAppointmentChange = () => {
    queryClient.invalidateQueries({ queryKey: notificationsKeys.list("user", targetId) });
    queryClient.invalidateQueries({ queryKey: notificationsKeys.unreadCount("user", targetId) });
  };

  return handleAppointmentChange;
};
