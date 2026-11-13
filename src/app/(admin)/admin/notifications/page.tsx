import Link from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaffPage } from "@/server/auth/guards";
import { getAdminNotifications } from "@/server/data/admin";
import {
  markAdminNotificationReadAction,
  markAllAdminNotificationsReadAction,
  runAdminJobsAction,
} from "@/server/actions/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const severityTone = {
  info: "info",
  warning: "warning",
  critical: "danger",
} as const;

export default async function AdminNotificationsPage() {
  await requireStaffPage();
  const notifications = await getAdminNotifications();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Notification centre"
        description="In-app reminders for rotation, inventory, inactivity and financial events. Email, SMS and voice delivery remain off until a provider is configured."
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminActionForm
              action={runAdminJobsAction}
              submitLabel="Run reminder jobs"
              pendingLabel="Running…"
              variant="outline"
              compact
              confirmMessage="Run inactivity and administrator reminder jobs now?"
            />
            <AdminActionForm
              action={markAllAdminNotificationsReadAction}
              submitLabel="Mark all read"
              pendingLabel="Saving…"
              variant="subtle"
              compact
              confirmMessage="Mark every administrator notification as read?"
            />
          </div>
        }
      />

      {notifications.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Bell}
            title="No administrator notifications"
            description="Rotation reminders, inventory warnings, inactivity warnings and financial events will appear here."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`surface-card rounded-[12px] p-3.5 ${
                notification.readAt ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  notification.severity === "critical"
                    ? "bg-danger"
                    : notification.severity === "warning"
                      ? "bg-warning"
                      : "bg-info"
                }`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[11.5px] font-semibold">{notification.title}</h2>
                    <Badge tone={severityTone[notification.severity as keyof typeof severityTone] ?? "neutral"}>
                      {notification.severity}
                    </Badge>
                    {!notification.readAt ? <Badge tone="outline">Unread</Badge> : null}
                    {notification.resolvedAt ? <Badge tone="success">Completed</Badge> : null}
                  </div>
                  <p className="mt-1.5 max-w-[900px] text-[10px] leading-4 text-muted-foreground">
                    {notification.body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8.5px] text-muted-foreground/70">
                    <span>{formatDateTime(notification.createdAt)}</span>
                    {notification.inventoryLabel ? (
                      <span>Inventory: {notification.inventoryLabel}</span>
                    ) : null}
                    {notification.username ? (
                      <span>Customer: {notification.username}</span>
                    ) : null}
                    {notification.actionUrl ? (
                      <Link href={notification.actionUrl} className="inline-flex items-center gap-1 underline underline-offset-2">
                        Open <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    ) : null}
                  </div>
                </div>
                {!notification.readAt ? (
                  <AdminActionForm
                    action={markAdminNotificationReadAction}
                    hidden={{ notificationId: notification.id }}
                    submitLabel="Mark read"
                    pendingLabel="Saving…"
                    variant="subtle"
                    compact
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
        <CheckCheck className="mt-0.5 h-3 w-3 shrink-0" />
        Notifications are deduplicated. An overdue rotation stays visible until an administrator confirms the new credentials.
      </div>
    </div>
  );
}
