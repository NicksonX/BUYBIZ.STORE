import Link from "next/link";
import {
  Bell,
  CheckCheck,
  CreditCard,
  LifeBuoy,
  Network,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { markAllNotificationsReadAction } from "@/server/actions/customer";
import { requireUserPage } from "@/server/auth/guards";
import { getNotifications } from "@/server/data/customer";
import { cn, formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const icons = {
  order: ReceiptText,
  allocation: Network,
  refund: RotateCcw,
  deposit: Wallet,
  support: LifeBuoy,
  system: Bell,
  security: ShieldCheck,
} as const;

export default async function NotificationsPage() {
  const user = await requireUserPage();
  const notifications = await getNotifications(user.id);
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div>
      <PageHeader
        eyebrow="Notifications"
        title="What's happened recently."
        description="Allocation, wallet, refund and support updates attached to your account. Notifications are in-app only in this release."
        actions={
          unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[10.5px] font-medium hover:bg-accent"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </form>
          ) : null
        }
      />

      <div className="mt-5">
        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nothing here yet"
            description="Order updates, proxy activations, expiry notices and support replies will appear here."
          />
        ) : (
          <div className="surface-card divide-y divide-border overflow-hidden rounded-[15px]">
            {notifications.map((notification) => {
              const Icon = icons[notification.type] ?? Bell;
              const unreadItem = !notification.readAt;
              const body = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors",
                    notification.href && "hover:bg-surface-subtle/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      unreadItem
                        ? "border-border bg-foreground text-background"
                        : "border-border bg-surface-subtle text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11.5px] font-medium">
                        {notification.title}
                      </p>
                      {unreadItem ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                      ) : null}
                      <Badge tone="neutral" className="ml-auto text-[8px] capitalize">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-[8.5px] text-muted-foreground/70">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              );
              return notification.href ? (
                <Link key={notification.id} href={notification.href}>
                  {body}
                </Link>
              ) : (
                <div key={notification.id}>{body}</div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9.5px] leading-4 text-muted-foreground">
        <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Email notifications are not configured in this release. In-app
          notifications and your dashboard records are the source of truth for
          order, refund and expiry events.
        </p>
      </div>
    </div>
  );
}
