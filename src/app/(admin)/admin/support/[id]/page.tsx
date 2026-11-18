import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/input";
import { AdminActionForm } from "@/components/admin/action-form";
import { requireStaffPage } from "@/server/auth/guards";
import { getAdminTicketDetail } from "@/server/data/admin";
import {
  adminTicketReplyAction,
  setTicketStatusAction,
} from "@/server/actions/admin";
import { ticketStatusMeta, titleCase } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";
import { SupportAutoRefresh } from "@/components/support/auto-refresh";

export const dynamic = "force-dynamic";

export default async function AdminSupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireStaffPage();
  const data = await getAdminTicketDetail(id);
  if (!data) notFound();
  const { ticket, messages } = data;
  const meta = ticketStatusMeta(ticket.status);

  return (
    <div>
      <PageHeader
        backHref="/admin/support"
        backLabel="Back to support"
        eyebrow={ticket.ticketNumber}
        title={ticket.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Link href={`/admin/users/${ticket.userId}`} className="text-[10px] font-medium underline underline-offset-2">
              {ticket.username}
            </Link>
            <span className="text-[10px]">{ticket.email}</span>
            <span className="text-[10px]">· {titleCase(ticket.category)} · {ticket.priority} priority</span>
          </span>
        }
      />

      <SupportAutoRefresh />
      <div className="mt-4 grid items-start gap-3 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="surface-card flex min-h-[520px] flex-col overflow-hidden rounded-[14px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium">
              <MessageSquare className="h-3.5 w-3.5" /> Conversation
            </div>
            <span className="text-[9px] text-muted-foreground">
              Last activity {formatDateTime(ticket.lastMessageAt)}
            </span>
          </div>
          <div className="flex-1 space-y-4 p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-2.5 ${message.isStaff ? "flex-row-reverse" : ""}`}>
                {message.isStaff ? (
                  <LogoMark className="mt-0.5 h-7 w-7 shrink-0" />
                ) : (
                  <Avatar name={ticket.username} size="xs" className="mt-0.5" />
                )}
                <div className={`max-w-[82%] ${message.isStaff ? "text-right" : ""}`}>
                  <div
                    className={`inline-block rounded-[11px] border px-3.5 py-2.5 text-left ${
                      message.isStaff
                        ? "border-foreground/10 bg-foreground text-background"
                        : "border-border bg-surface-subtle text-foreground"
                    }`}
                  >
                    <p className={`text-[8.5px] font-semibold ${message.isStaff ? "text-background/55" : "text-muted-foreground"}`}>
                      {message.isStaff ? (message.isAi ? "BUYBIZ AI Support" : `BUYBIZ Support · ${message.authorName ?? "Staff"}`) : ticket.username}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-5">{message.body}</p>
                  </div>
                  <p className="mt-1 text-[8px] text-muted-foreground">{formatDateTime(message.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <AdminActionForm
              action={adminTicketReplyAction}
              hidden={{ ticketId: ticket.id }}
              submitLabel="Send reply"
              pendingLabel="Sending…"
              className="[&>button]:ml-auto"
            >
              <Textarea
                name="message"
                required
                maxLength={5000}
                placeholder="Write a reply to the customer. Do not request passwords or card details."
                className="min-h-24 text-[11px]"
                aria-label="Reply to customer"
              />
            </AdminActionForm>
          </div>
        </section>

        <div className="space-y-3">
          <section className="surface-card rounded-[13px] p-4">
            <h2 className="text-[11px] font-semibold">Ticket actions</h2>
            <p className="mt-1 text-[9px] text-muted-foreground">Status changes are recorded in the audit log.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["open", "pending", "resolved", "closed"] as const).map((status) => (
                <AdminActionForm
                  key={status}
                  action={setTicketStatusAction}
                  hidden={{ ticketId: ticket.id, status }}
                  submitLabel={titleCase(status)}
                  variant={status === "closed" ? "danger" : "outline"}
                  compact
                  className="inline-flex"
                  confirmMessage={`Set this ticket to ${status}?`}
                />
              ))}
            </div>
          </section>

          <section className="surface-card rounded-[13px] p-4">
            <h2 className="text-[11px] font-semibold">Details</h2>
            <dl className="mt-3 space-y-2 text-[9.5px]">
              <Row label="Customer" value={ticket.username} />
              <Row label="Email" value={ticket.email} />
              <Row label="Created" value={formatDateTime(ticket.createdAt)} />
              <Row label="Priority" value={ticket.priority} />
              <Row label="Category" value={titleCase(ticket.category)} />
              <Row label="Messages" value={String(ticket.messageCount)} />
            </dl>
            <Link href={`/admin/users/${ticket.userId}`} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[9.5px] hover:bg-accent">
              Open customer <ArrowUpRight className="h-3 w-3" />
            </Link>
          </section>

          <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            Customers see staff replies in their dashboard. Be precise and do not
            promise a refund, allocation or revocation that has not been recorded.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] break-all text-right font-medium capitalize">{value}</dd>
    </div>
  );
}
