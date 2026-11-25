import { Bell, MailOpen } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-context";
import {
  type NotificationItem,
  useMarkNotificationAsRead,
  useNotifications,
  useNotificationToast,
  useUnreadCount,
} from "@/features/notifications/notifications-hook";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NOTIFICATION_POLL_MS = 15_000; // 15 seconds

const typeIcons: Record<string, string> = {
  appointment_created: "📅",
  appointment_confirmed: "✔️",
  appointment_cancelled: "❌",
  appointment_completed: "✅",
};

/* ------------------------------------------------------------------ */
/*  Unread badge                                                       */
/* ------------------------------------------------------------------ */

const UnreadBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white shadow-sm ring-2 ring-[var(--topbar)]">
      {count > 99 ? "99+" : count}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Dropdown panel                                                     */
/* ------------------------------------------------------------------ */

const NotificationPanel = ({
  notifications,
  unreadCount,
  isLoading,
  onMarkRead,
  onViewAll,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  onViewAll: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-[22rem] p-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
        <h3 className="text-sm font-semibold">{t("notifications.title", "Notificaciones")}</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            className="text-xs text-[var(--muted-foreground)] underline-offset-2 hover:underline"
            onClick={() => {
              for (const n of notifications) onMarkRead(n.id);
            }}
          >
            {t("notifications.markAllRead", "Marcar todas como leídas")}
          </button>
        )}
      </div>

      {/* List */}
      <ul
        className="max-h-80 min-w-0 overflow-y-auto"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-[var(--muted-foreground)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--foreground)] border-t-transparent" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-[var(--muted-foreground)]">
            <MailOpen className="h-8 w-8 text-[var(--muted-foreground)]" />
            <p>{t("notifications.empty", "No tenés notificaciones")}</p>
          </div>
        )}

        {!isLoading &&
          notifications.map((notification) => {
            const type = notification.type;
            return (
              <li key={notification.id} className="w-full border-b border-[var(--border)]">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-panel)]",
                    !notification.read && "bg-[var(--surface-panel)]",
                  )}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <span className="mt-0.5 text-sm" aria-hidden>
                    {typeIcons[type] ?? "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                      {new Date(notification.createdAt).toLocaleString(undefined, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              </li>
            );
          })}
      </ul>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <button
            type="button"
            className="block w-full text-center text-xs font-medium text-[var(--muted-foreground)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
            onClick={onViewAll}
          >
            {t("notifications.viewAll", "Ver todas las notificaciones")}
          </button>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Bell button                                                        */
/* ------------------------------------------------------------------ */

export const NotificationBell = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userId = session?.user.id ?? "";

  // Poll for unread count
  const { data: unreadData, isLoading: countLoading } = useUnreadCount(userId);
  const unreadCount = unreadData?.count ?? 0;

  // Fetch last 5 for dropdown preview
  const { data: listData, isLoading: listLoading } = useNotifications(userId, 1);
  const recentNotifications = listData?.data?.slice(0, 5) ?? [];

  const markRead = useMarkNotificationAsRead();
  const onAppointmentChange = useNotificationToast(userId);

  // Track previous unread count to detect new notifications on poll
  const prevUnreadCountRef = useRef<number | undefined>(undefined);

  // Show toast when unread count increases (new notification arrived)
  useEffect(() => {
    if (prevUnreadCountRef.current !== undefined && unreadCount > prevUnreadCountRef.current) {
      const delta = unreadCount - prevUnreadCountRef.current;
      toast("Notificación nueva", {
        description:
          delta === 1 ? "Tenés una notificación nueva" : `Tenés ${delta} notificaciones nuevas`,
        duration: 4000,
      });
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Polling effect — invalidate queries periodically
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      onAppointmentChange();
    }, NOTIFICATION_POLL_MS);
    return () => clearInterval(interval);
  }, [userId, onAppointmentChange]);

  // Open notifications page
  const handleViewAll = () => navigate("/app/notifications");

  // Mark single notification as read (from dropdown)
  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex items-center justify-center rounded-full p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-panel)] hover:text-[var(--foreground)]"
          aria-label={t("notifications.title", "Notificaciones")}
        >
          <Bell className="h-5 w-5" />
          <UnreadBadge count={unreadCount} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="border-[var(--border)] bg-[var(--surface)] shadow-lg"
      >
        <NotificationPanel
          notifications={recentNotifications}
          unreadCount={unreadCount}
          isLoading={countLoading || listLoading}
          onMarkRead={handleMarkRead}
          onViewAll={handleViewAll}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
