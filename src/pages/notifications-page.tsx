import { ArrowLeft, CheckCheck, MailOpen, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-context";
import {
  useMarkNotificationAsRead,
  useNotifications,
} from "@/features/notifications/notifications-hook";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, string> = {
  appointment_created: "📅",
  appointment_confirmed: "✔️",
  appointment_cancelled: "❌",
  appointment_completed: "✅",
};

export const NotificationsPage = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userId = session?.user.id ?? "";

  const { data, isLoading, isFetching } = useNotifications(userId, 1);

  const markRead = useMarkNotificationAsRead();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    for (const n of notifications) markRead.mutate(n.id);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{t("notifications.title", "Notificaciones")}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {total} {total === 1 ? "notificación" : "notificaciones"}
            </p>
          </div>
        </div>

        {notifications.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" />
            {t("notifications.markAllRead", "Marcar todas como leídas")}
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-3">
          {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((id) => (
            <div
              key={id}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] py-16">
          <MailOpen className="h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("notifications.empty", "No tenés notificaciones")}
          </p>
        </div>
      )}

      {!isLoading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const type = notification.type;
            return (
              <button
                key={notification.id}
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  !notification.read
                    ? "border-[var(--border)] bg-[var(--surface)]"
                    : "border-[var(--border)] bg-[var(--surface-panel)] opacity-70",
                )}
                onClick={() => handleMarkRead(notification.id)}
              >
                <span className="mt-0.5 text-lg" aria-hidden>
                  {typeIcons[type] ?? "🔔"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{notification.body}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    {new Date(notification.createdAt).toLocaleString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Refresh indicator */}
      {isFetching && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-[var(--muted-foreground)]">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Actualizando…
        </div>
      )}
    </div>
  );
};
