import Link from "next/link";
import { ArrowUpRight, LifeBuoy, Mail, MessageSquare, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminActionForm } from "@/components/admin/action-form";
import { requireStaffPage } from "@/server/auth/guards";
import {
  getAdminTickets,
  getContactMessages,
} from "@/server/data/admin";
import { updateContactMessageStatusAction } from "@/server/actions/admin";
import { getAiSupportConversations } from "@/server/services/support-ai";
import { getDb } from "@/lib/db";
import { toggleAiSupportAction } from "@/server/actions/admin";
import { ticketStatusMeta } from "@/lib/status";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireStaffPage();
  const params = await searchParams;
  const q = (first(params.q) ?? "").trim().toLowerCase();
  const statusFilter = first(params.status) ?? "all";
  const priorityFilter = first(params.priority) ?? "all";
  const db = await getDb();
  const [allTickets, contactMessages, aiConversations, aiSetting] = await Promise.all([
    getAdminTickets(),
    getContactMessages(),
    getAiSupportConversations(),
    db.query<{ enabled: unknown }>(`select value as enabled from app_settings where key='ai_support_enabled' limit 1`),
  ]);
  const aiEnabled = aiSetting.rows[0]?.enabled !== false;
  const tickets = allTickets.filter((ticket) => {
    const matchesQuery = !q || ticket.subject.toLowerCase().includes(q) || ticket.username.toLowerCase().includes(q) || ticket.ticketNumber.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesQuery && matchesStatus && matchesPriority;
  });
  const open = allTickets.filter((ticket) => ticket.status === "open").length;
  const pending = allTickets.filter((ticket) => ticket.status === "pending").length;
  const resolved = allTickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status)).length;
  const highPriority = allTickets.filter((ticket) => ticket.priority === "high" && !["resolved", "closed"].includes(ticket.status)).length;
  const newMessages = contactMessages.filter((message) => message.status === "new").length;

  return (
    <div>
      <PageHeader
        eyebrow="Support"
        title="Support inbox"
        description="Customer tickets and public contact messages. Replies are recorded against the ticket and shown in the customer dashboard."
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          { label: "Open", value: open, icon: LifeBuoy },
          { label: "Awaiting customer", value: pending, icon: MessageSquare },
          { label: "High priority", value: highPriority, icon: LifeBuoy },
          { label: "Resolved", value: resolved, icon: MessageSquare },
          { label: "New contact", value: newMessages, icon: Mail },
        ].map((item) => (
          <div key={item.label} className="surface-card rounded-[11px] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground">{item.label}</p>
              <item.icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="tabular mt-1.5 text-[18px] font-semibold leading-none">{item.value}</p>
          </div>
        ))}
      </div>

      <form method="get" className="surface-card mt-3 flex flex-wrap gap-2 rounded-[12px] p-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search subject, username or ticket" className="h-9 pl-8 text-[11.5px]" aria-label="Search tickets" />
        </div>
        <select name="status" defaultValue={statusFilter} aria-label="Filter by status" className="h-9 rounded-full border border-border bg-surface px-3 text-[10px]">
          <option value="all">All statuses</option><option value="open">Open</option><option value="pending">Awaiting customer</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
        <select name="priority" defaultValue={priorityFilter} aria-label="Filter by priority" className="h-9 rounded-full border border-border bg-surface px-3 text-[10px]">
          <option value="all">All priorities</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
        </select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Apply</button>
        <Link href="/admin/support" className="inline-flex h-9 items-center rounded-full border border-border px-3 text-[10px] text-muted-foreground">Reset</Link>
      </form>

      <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div><h2 className="text-[12px] font-semibold">AI support conversations</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Read-only transcript metadata. Escalated chats also create a support ticket.</p></div>
          <form action={toggleAiSupportAction}>
            <input type="hidden" name="enabled" value={String(!aiEnabled)} />
            <button type="submit" className="rounded-full border border-border px-3 py-1.5 text-[9.5px] font-medium">{aiEnabled ? "Disable AI support" : "Enable AI support"}</button>
          </form>
        </div>
        {aiConversations.length ? (
          <div className="divide-y divide-border">
            {aiConversations.slice(0, 10).map((conversation) => (
              <div key={conversation.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[9.5px]">
                <span className="font-medium">{conversation.username} <span className="text-muted-foreground">({conversation.email})</span></span>
                <span className="text-muted-foreground">{conversation.count} messages · {formatRelativeTime(conversation.updatedAt)}</span>
                <span className={conversation.flagged ? "text-danger" : conversation.status === "escalated" ? "text-warning" : "text-success"}>{conversation.flagged ? "flagged" : conversation.status}</span>
              </div>
            ))}
          </div>
        ) : <p className="px-4 py-4 text-[9.5px] text-muted-foreground">No AI conversations yet.</p>}
      </section>

      <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Customer tickets</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Open and pending tickets appear first.
          </p>
        </div>
        {tickets.length ? (
          <div className="divide-y divide-border">
            {tickets.map((ticket) => {
              const meta = ticketStatusMeta(ticket.status);
              return (
                <Link
                  key={ticket.id}
                  href={`/admin/support/${ticket.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle/50"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-medium">{ticket.subject}</p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">
                        {ticket.ticketNumber} · {ticket.username} · {ticket.messageCount} messages · {formatRelativeTime(ticket.lastMessageAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={LifeBuoy} title="No tickets match" description="Try another search term." />
        )}
      </section>

      <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Public contact messages</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Submitted from the public Contact page. These are not linked to an account.
          </p>
        </div>
        {contactMessages.length ? (
          <div className="divide-y divide-border">
            {contactMessages.map((message) => (
              <div key={message.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10.5px] font-medium">{message.subject}</p>
                    <p className="mt-0.5 text-[9px] text-muted-foreground">
                      {message.name} · {message.email} · {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                  <Badge tone={message.status === "new" ? "warning" : "neutral"} className="capitalize">
                    {message.status}
                  </Badge>
                </div>
                <p className="mt-2 max-w-[760px] whitespace-pre-wrap text-[9.5px] leading-5 text-muted-foreground">
                  {message.message}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.status !== "read" ? (
                    <AdminActionForm
                      action={updateContactMessageStatusAction}
                      hidden={{ messageId: message.id, status: "read" }}
                      submitLabel="Mark read"
                      variant="outline"
                      compact
                      className="inline-flex"
                    />
                  ) : null}
                  {message.status !== "archived" ? (
                    <AdminActionForm
                      action={updateContactMessageStatusAction}
                      hidden={{ messageId: message.id, status: "archived" }}
                      submitLabel="Archive"
                      variant="subtle"
                      compact
                      className="inline-flex"
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-[10px] text-muted-foreground">No contact messages.</p>
        )}
      </section>
    </div>
  );
}
