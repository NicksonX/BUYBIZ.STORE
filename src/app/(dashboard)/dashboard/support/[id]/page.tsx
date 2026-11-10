import { notFound } from "next/navigation";
import {
  Clock3,
  MessageSquare,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";
import { ReplyForm } from "@/components/support/reply-form";
import { requireUserPage } from "@/server/auth/guards";
import { getTicketForUser } from "@/server/data/customer";
import { ticketStatusMeta, titleCase } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUserPage();
  const data = await getTicketForUser(user.id, id);
  if (!data) notFound();
  const { ticket, messages } = data;
  const meta = ticketStatusMeta(ticket.status);
  const closed = ticket.status === "closed";

  return (
    <div>
      <PageHeader
        backHref="/dashboard/support"
        backLabel="Back to support"
        eyebrow={ticket.ticketNumber}
        title={ticket.subject}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="inline-flex items-center gap-1 text-[10px]">
              <Tag className="h-3 w-3" /> {titleCase(ticket.category)}
            </span>
            <span className="text-[10px]">Priority: {ticket.priority}</span>
          </span>
        }
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="surface-card flex min-h-[480px] flex-col overflow-hidden rounded-[15px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium">
              <MessageSquare className="h-3.5 w-3.5" />
              Conversation
            </div>
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Clock3 className="h-3 w-3" /> Last activity{" "}
              {formatDateTime(ticket.lastMessageAt)}
            </span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => {
              const staff = message.isStaff;
              return (
                <div
                  key={message.id}
                  className={`flex gap-2.5 ${staff ? "" : "flex-row-reverse"}`}
                >
                  {staff ? (
                    <LogoMark className="mt-0.5 h-7 w-7 shrink-0" />
                  ) : (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[9px] font-semibold text-background">
                      {user.username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className={`max-w-[85%] ${staff ? "" : "text-right"}`}>
                    <div
                      className={`inline-block rounded-[12px] border px-3.5 py-2.5 text-left ${
                        staff
                          ? "border-border bg-surface-subtle"
                          : "border-foreground/10 bg-foreground text-background"
                      }`}
                    >
                      <p
                        className={`text-[9px] font-semibold ${
                          staff ? "text-muted-foreground" : "text-background/55"
                        }`}
                      >
                        {staff ? "BUYBIZ Support" : "You"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[10.5px] leading-5">
                        {message.body}
                      </p>
                    </div>
                    <p className="mt-1 text-[8px] text-muted-foreground">
                      {formatDateTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border p-4">
            <ReplyForm ticketId={ticket.id} closed={closed} />
          </div>
        </section>

        <div className="space-y-3">
          <section className="surface-card rounded-[14px] p-4">
            <h2 className="text-[11px] font-semibold">Ticket details</h2>
            <dl className="mt-3 space-y-2.5 text-[9.5px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Ticket</dt>
                <dd className="font-mono">{ticket.ticketNumber}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Category</dt>
                <dd>{titleCase(ticket.category)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="capitalize">{ticket.priority}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDateTime(ticket.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{meta.label}</dd>
              </div>
            </dl>
          </section>

          <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            <p>
              Staff replies are marked with BUYBIZ Support and are recorded
              against your ticket. We never ask for your password or card
              details in a ticket.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
