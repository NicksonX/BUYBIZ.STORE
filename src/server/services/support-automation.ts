import "server-only";
import { getDb } from "@/lib/db";
import { askGemini } from "@/server/services/gemini";
import { notifyUser } from "@/server/services/notifications";

const KNOWLEDGE = `BUYBIZ platform rules:
- Proxies: shared or personal, purchased from wallet; available only when verified country inventory exists. 7-day shared plans are up to 20 active users per IP; personal is one customer.
- Deposit minimum: NGN 2,500 now; changes to NGN 3,000 on 20 Nov 2026 00:00 Africa/Lagos. Paystack/deposits are verified; a deposit alone is not a proxy purchase.
- Refunds: failed/out-of-stock proxy allocation is refunded automatically to wallet.
- Referral: $3 USD per valid referral; requires successful wallet deposit and a completed fulfilled proxy purchase of at least 7 days. Registered referrals appear immediately but are pending until qualified. Ambassador threshold is 2 valid referrals.
- Campaign: BUYBIZ Season of Rewards, $10 customer + $10 referrer per qualifying referral; dates from admin config; campaign rewards are separate from normal referrals.
- Rewards: USD rewards separate from NGN wallet; USDT BEP20 payout address; payouts only after configured payout date and manual review.
- Giveaways: shared code, limited claims, one claim per user; wallet address required after claim; payment only after blockchain confirmation.
- Treasury/wallet: BUYBIZ never asks for seed phrases or private keys. USDT BEP20 only for treasury.
- Refund/payment support must never request passwords, OTPs, seed phrases or private keys.
Links: /faq, /how-it-works, /terms, /dashboard/wallet, /dashboard/marketplace, /dashboard/referrals, /dashboard/campaigns, /dashboard/rewards, /dashboard/support.
Do not invent account-specific balances or promise an action was performed.`;

function fallback(message: string) {
  const lower = message.toLowerCase();
  const link = /referr|ambassador/.test(lower) ? "/dashboard/referrals" : /campaign|\$10/.test(lower) ? "/dashboard/campaigns" : /reward|payout|usdt/.test(lower) ? "/dashboard/rewards" : /deposit|wallet|refund|paystack/.test(lower) ? "/dashboard/wallet" : /proxy|plan|price|stock/.test(lower) ? "/dashboard/marketplace" : "/faq";
  return `I understand this is important. I’ve checked the BUYBIZ rules and can help with the next step. Please review the relevant guide here: ${link}. If your issue is account-specific, tell me what you see and I’ll route it to the right place.\n\nHas this resolved your issue? Reply YES to close, or tell me what is still wrong.`;
}

export async function autoReplyToTicket(input: { ticketId: string; userId: string; subject: string; message: string }) {
  const db = await getDb();
  const human = await db.query(`select 1 from support_messages where ticket_id=$1 and is_staff=true and is_ai=false limit 1`, [input.ticketId]);
  if (human.rows[0]) return { replied: false, reason: "human_takeover" };
  const asksHuman = /(human|agent|person|real support|escalate)/i.test(input.message);
  if (asksHuman) {
    await db.query(`update support_tickets set status='open', updated_at=now() where id=$1`, [input.ticketId]);
    await db.query(`insert into support_messages (ticket_id,author_user_id,is_staff,is_ai,body) values ($1,null,true,true,$2)`, [input.ticketId, "I’m connecting this to a human support agent. Your ticket remains open and a person will review it. I won’t close it automatically."]);
    return { replied: true, human: true };
  }
  const generated = await askGemini(`You are BUYBIZ Support. Be empathetic, concise and practical. Use only these platform facts; never invent balances or actions. Ask the customer to confirm whether the issue is resolved. Do not request secrets.\n\n${KNOWLEDGE}\n\nTicket subject: ${input.subject}\nCustomer message: ${input.message}`);
  const reply = generated ?? fallback(input.message);
  await db.transaction(async (tx) => {
    await tx.query(`insert into support_messages (ticket_id,author_user_id,is_staff,is_ai,body) values ($1,null,true,true,$2)`, [input.ticketId, reply]);
    await tx.query(`update support_tickets set status='pending', close_requested_at=now(), ai_auto_replied_at=now(), last_message_at=now(), updated_at=now() where id=$1`, [input.ticketId]);
    await notifyUser(tx, { userId: input.userId, type: "support", title: "BUYBIZ Support replied", body: "An AI support reply is ready in your ticket.", href: `/dashboard/support/${input.ticketId}` });
  });
  return { replied: true, human: false };
}

export async function closeStaleSupportTickets(now = new Date()) {
  const db = await getDb();
  const stale = await db.query<{ id: string; userId: string }>(
    `select id,user_id as "userId" from support_tickets
      where status='pending' and close_requested_at is not null
        and close_requested_at <= $1 - interval '5 minutes'`,
    [now],
  );
  let closed = 0;
  for (const ticket of stale.rows) {
    await db.transaction(async (tx) => {
      await tx.query(`update support_tickets set status='closed',closed_at=now(),updated_at=now() where id=$1`, [ticket.id]);
      await tx.query(`insert into support_messages (ticket_id,author_user_id,is_staff,is_ai,body) values ($1,null,true,true,$2)`, [ticket.id, "I’m closing this ticket after no further response. If you still need help, reopen a new ticket. Please rate this support experience from 1 to 5 and leave feedback."]);
      await notifyUser(tx, { userId: ticket.userId, type: "support", title: "Support ticket closed", body: "Please rate the support you received.", href: `/dashboard/support/${ticket.id}` });
    });
    closed += 1;
  }
  return { closed, evaluated: stale.rows.length };
}

export async function rateSupportTicket(input: { userId: string; ticketId: string; rating: number; feedback: string }) {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("Rating must be 1 to 5.");
  const db = await getDb();
  await db.query(`update support_tickets set rating=$3,feedback=$4,rated_at=now(),updated_at=now() where id=$1 and user_id=$2 and status='closed'`, [input.ticketId, input.userId, input.rating, input.feedback.trim().slice(0, 1000)]);
}
