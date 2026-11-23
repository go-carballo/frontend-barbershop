import { http } from "@/lib/http";

/**
 * Notification shape returned by the backend. The UI displays `type`, `title`,
 * `body`, `read`, `createdAt`, and the optional `appointmentId`.
 */
export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  userId: string | null;
  appointmentId: string | null;
  customerId: string | null;
  barberId: string | null;
  emailSent: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListResponse = {
  data: NotificationItem[];
  total: number;
  page: number;
  perPage: number;
};

export type UnreadCountResponse = {
  count: number;
};

/* ---- Key functions (TanStack Query keys) ---- */

export const notificationsKeys = {
  all: ["notifications"] as const,
  list: (targetType: "user" | "customer" | "barber", targetId: string) =>
    ["notifications", "list", targetType, targetId] as const,
  unreadCount: (targetType: "user" | "customer" | "barber", targetId: string) =>
    ["notifications", "unreadCount", targetType, targetId] as const,
  detail: (id: string) => ["notifications", "detail", id] as const,
};

/* ---- Request helpers ---- */

/** Fetch paginated list of notifications for a target (user, customer, or barber). */
export const getNotificationsRequest = (
  targetType: "user" | "customer" | "barber",
  targetId: string,
  page = 1,
  perPage = 20,
  signal?: AbortSignal,
) =>
  http<NotificationListResponse>(
    `/notifications?targetType=${targetType}&targetId=${targetId}&page=${page}&perPage=${perPage}`,
    { signal },
  );

/** Fetch unread count for a target. */
export const getUnreadCountRequest = (
  targetType: "user" | "customer" | "barber",
  targetId: string,
  signal?: AbortSignal,
) =>
  http<UnreadCountResponse>(
    `/notifications/unread/count?targetType=${targetType}&targetId=${targetId}`,
    { signal },
  );

/** Mark a single notification as read. */
export const markNotificationAsReadRequest = (notificationId: string, signal?: AbortSignal) =>
  http<NotificationItem>(`/notifications/${notificationId}/read`, {
    method: "PATCH",
    signal,
  });

/* ---- Local toast state (not in React Query — client-only) ---- */

let localToasts: NotificationItem[] = [];

export const addLocalToast = (toast: NotificationItem) => {
  localToasts = [toast, ...localToasts].slice(0, 50);
};

export const getLocalToasts = (): NotificationItem[] => localToasts;

export const clearLocalToasts = () => {
  localToasts = [];
};
