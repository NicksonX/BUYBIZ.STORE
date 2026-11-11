import Link from "next/link";
import { ArrowUpRight, LifeBuoy, MessageSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { requireUserPage } from "@/server/auth/guards";
import { isAiSupportConfigured } from "@/lib/config";
import { getTicketsForUser } from "@/server/data/customer";
import { ticketStatusMeta, titleCase } from "@/lib/status";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AiSupportAssistant } from "@/components/support/ai-assistant";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await requireUserPage();
  const tickets = await getTicketsForUser(user.id);

  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="Talk to the BUYBIZ team."
        description="Support threads stay attached to your account. Include an order number where possible so we can trace the wallet and allocation records."
        actions={
          <Link
            href="/dashboard/support/new"
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "h-9 rounded-full px-4",
            )}
          >
            <Plus className="h-3.5 w-3.5" /> New ticket
          </Link>
        }
      />

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <AiSupportAssistant configured={isAiSupportConfigured()} />
          <div>
          {tickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No support tickets yet"
              description="Open a ticket if you need help with a proxy, deposit, refund or your account."
              action={
                <Link
                  href="/dashboard/support/new"
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" }),
                    "rounded-full px-4",
                  )}
                >
                  Open a ticket
                </Link>
              }
            />
          ) : (
            <div className="surface-card divide-y divide-border overflow-hidden rounded-[15px]">
              {tickets.map((ticket) => {
                const meta = ticketStatusMeta(ticket.status);
                return (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/support/${ticket.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-surface-subtle/60"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border bg-surface-subtle">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[12px] font-medium">
                            {ticket.subject}
                          </p>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                        </div>
                        <p className="mt-1 text-[9.5px] text-muted-foreground">
                          {ticket.ticketNumber} · {titleCase(ticket.category)} ·{" "}
                          {ticket.priority} priority · {ticket.messageCount}{" "}
                          {ticket.messageCount === 1 ? "message" : "messages"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                      {formatRelativeTime(ticket.lastMessageAt)}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
                <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9.5px] leading-4 text-muted-foreground">
        <LifeBuoy className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          BUYBIZ support is handled inside your dashboard. Never share your
          password or full payment card details in a ticket. For access issues,
          tell us whether the problem is with the connection details or the
          remaining access window.
        </p>
      </div>

        </div>
        </div>

        <aside className="space-y-3">
          <div className="surface-card rounded-[14px] p-4">
            <h2 className="text-[11px] font-semibold">Before you open a ticket</h2>
            <ul className="mt-2 space-y-2 text-[9.5px] leading-4 text-muted-foreground">
              <li>Check that your proxy still shows as active.</li>
              <li>Include the order number if this is about a purchase.</li>
              <li>For deposits, include the reference from your wallet history.</li>
              <li>Tell us the exact error message you see.</li>
            </ul>
          </div>
          <div className="surface-card rounded-[14px] p-4">
            <h2 className="text-[11px] font-semibold">Quick answers</h2>
            <div className="mt-2 space-y-1.5">
              <Link href="/faq" className="flex items-center justify-between text-[9.5px] text-muted-foreground hover:text-foreground">
                Refunds and expiry <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link href="/how-it-works#shared" className="flex items-center justify-between text-[9.5px] text-muted-foreground hover:text-foreground">
                Shared proxy access <ArrowUpRight className="h-3 w-3" />
              </Link>
              <Link href="/how-it-works#wallet" className="flex items-center justify-between text-[9.5px] text-muted-foreground hover:text-foreground">
                How the wallet works <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="rounded-[12px] border border-border bg-surface-subtle p-3.5 text-[9px] leading-4 text-muted-foreground">
            Replies appear in this dashboard. There is no public support phone
            line, so keep the conversation here.
          </div>
        </aside>
      </div>

    </div>
  );
}
