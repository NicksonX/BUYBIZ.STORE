import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { TicketCategory, TicketPriority } from "@/lib/db/types";
import { AppError } from "@/lib/errors";
import { notifyUser } from "@/server/services/notifications";

function ticketNumber() {
  return `TKT-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createSupportTicket(input: {
  userId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  message: string;
}) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const ticketId = randomUUID();
    const number = ticketNumber();
    await tx.query(
      `insert into support_tickets
         (id, ticket_number, user_id, subject, category, priority, status,
          last_message_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,'open',now(),now(),now())`,
      [
        ticketId,
        number,
        input.userId,
        input.subject,
        input.category,
        input.priority,
      ],
    );
    await tx.query(
      `insert into support_messages (ticket_id, author_user_id, is_staff, body)
       values ($1,$2,false,$3)`,
      [ticketId, input.userId, input.message],
    );
    await notifyUser(tx, {
      userId: input.userId,
      type: "support",
      title: "Support ticket received",
      body: `We received “${input.subject}” (${number}). A support agent will reply in your dashboard.`,
      href: `/dashboard/support/${ticketId}`,
    });
    return { ticketId, ticketNumber: number };
  });
}

export async function replyToOwnTicket(input: {
  userId: string;
  ticketId: string;
  message: string;
}) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const ticket = await tx.query<{
      id: string;
      status: string;
      subject: string;
      ticketNumber: string;
    }>(
      `select id, status, subject, ticket_number as "ticketNumber"
         from support_tickets where id = $1 and user_id = $2 limit 1 for update`,
      [input.ticketId, input.userId],
    );
    const row = ticket.rows[0];
    if (!row) throw new AppError("NOT_FOUND", "That ticket could not be found.");
    if (row.status === "closed") {
      throw new AppError("CONFLICT", "This ticket is closed. Open a new ticket.");
    }
    await tx.query(
      `insert into support_messages (ticket_id, author_user_id, is_staff, body)
       values ($1,$2,false,$3)`,
      [row.id, input.userId, input.message],
    );
    await tx.query(
      `update support_tickets
          set status = 'open', last_message_at = now(), updated_at = now()
        where id = $1`,
      [row.id],
    );
    return { ticketId: row.id };
  });
}

export async function replyAsStaff(input: {
  staffId: string;
  staffRole: string;
  ticketId: string;
  message: string;
}) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const ticket = await tx.query<{
      id: string;
      status: string;
      subject: string;
      userId: string;
      ticketNumber: string;
    }>(
      `select id, status, subject, user_id as "userId",
              ticket_number as "ticketNumber"
         from support_tickets where id = $1 limit 1 for update`,
      [input.ticketId],
    );
    const row = ticket.rows[0];
    if (!row) throw new AppError("NOT_FOUND", "That ticket could not be found.");
    await tx.query(
      `insert into support_messages (ticket_id, author_user_id, is_staff, body)
       values ($1,$2,true,$3)`,
      [row.id, input.staffId, input.message],
    );
    await tx.query(
      `update support_tickets
          set status = (case when status = 'closed' then 'open' else 'pending' end)::ticket_status,
              close_requested_at = null,
              last_message_at = now(), updated_at = now()
        where id = $1`,
      [row.id],
    );
    await notifyUser(tx, {
      userId: row.userId,
      type: "support",
      title: "Support replied to your ticket",
      body: `A BUYBIZ agent replied to “${row.subject}” (${row.ticketNumber}).`,
      href: `/dashboard/support/${row.id}`,
    });
    return { ticketId: row.id };
  });
}

export async function updateTicketStatus(input: {
  staffId: string;
  ticketId: string;
  status: "open" | "pending" | "resolved" | "closed";
}) {
  const db = await getDb();
  const result = await db.query<{ userId: string; subject: string }>(
    `update support_tickets
        set status = $2,
            closed_at = case when $2 in ('resolved','closed') then now() else null end,
            updated_at = now()
      where id = $1
      returning user_id as "userId", subject`,
    [input.ticketId, input.status],
  );
  if (!result.rows[0]) {
    throw new AppError("NOT_FOUND", "That ticket could not be found.");
  }
  return result.rows[0];
}
