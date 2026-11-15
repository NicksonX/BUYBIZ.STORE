import "server-only";
import { getDb } from "@/lib/db";
import { countryCodeFromText, countryName } from "@/lib/ai/countries";
import { getFeaturedCampaign } from "@/server/services/campaigns";
import { getAmbassadorConfig } from "@/server/services/ambassador";
import { createSupportTicket } from "@/server/services/support";
import { getWalletSummary } from "@/server/data/customer";
import { writeAuditLog } from "@/server/services/audit";

const WELCOME = "Hello! Welcome to BUYBIZ. I'm your virtual support assistant. I can help you with proxy purchases, account questions, payments, referrals and rewards. How can I help you today?";

function naira(minor: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(minor / 100);
}

function date(value: Date | string | null | undefined) {
  if (!value) return "not set";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(value));
}

async function knowledge() {
  const db = await getDb();
  const [products, countries, campaign, ambassador] = await Promise.all([
    db.query<{ name: string; priceMinor: number; durationSeconds: number }>(
      `select name, price_minor::bigint as "priceMinor", duration_seconds as "durationSeconds"
         from products where category='proxy' and is_active=true and is_coming_soon=false order by sort_order`,
    ),
    db.query<{ code: string; available: number }>(
      `select country_code as code, count(*) filter (where status='available')::int as available
         from proxy_inventory where archived_at is null and country_code is not null
        group by country_code order by country_code`,
    ),
    getFeaturedCampaign().catch(() => null),
    getAmbassadorConfig().catch(() => null),
  ]);
  return { products: products.rows, countries: countries.rows, campaign, ambassador };
}

export async function answerSupportQuestion(input: {
  userId: string;
  message: string;
  conversationId?: string | null;
}) {
  const db = await getDb();
  const message = input.message.trim().slice(0, 1200);
  const lower = message.toLowerCase();

  let conversationId = input.conversationId ?? null;
  if (conversationId) {
    const owns = await db.query(`select id from ai_support_conversations where id=$1 and user_id=$2 limit 1`, [conversationId, input.userId]);
    if (!owns.rows[0]) conversationId = null;
  }
  if (!conversationId) {
    const created = await db.query<{ id: string }>(
      `insert into ai_support_conversations (user_id) values ($1) returning id`,
      [input.userId],
    );
    conversationId = created.rows[0].id;
  }
  await db.query(`insert into ai_support_messages (conversation_id,user_id,role,body) values ($1,$2,'user',$3)`, [conversationId, input.userId, message]);

  let reply = "";
  let ticketNumber: string | null = null;
  let flagged = false;

  const sensitive = /ignore (all )?(previous|prior) instructions|system prompt|api[_ -]?key|environment variable|other customer|another customer|admin password|reveal.*(password|credential|secret)/i.test(message);
  if (sensitive) {
    flagged = true;
    reply = "I can’t share private business information, another customer’s data or credentials. I have not changed your account. This chat is flagged for human review.";
    await db.query(`update ai_support_conversations set flagged=true, updated_at=now() where id=$1`, [conversationId]);
    await db.transaction((tx) => writeAuditLog(tx, { actorUserId: input.userId, actorRole: "customer", action: "ai.support_security_flag", entityType: "user", entityId: input.userId, metadata: { reason: "prompt_injection_or_private_data" } })).catch(() => undefined);
  } else if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower) || lower.length < 4) {
    reply = WELCOME;
  } else {
    const k = await knowledge();
    const countryCode = countryCodeFromText(message);
    const askingAvailability = /(available|availability|stock|do you have|proxy.*(in|for)|country|location)/i.test(message) && countryCode;
    const askingProxyStatus = /(where.*proxy|my proxy|proxy.*status|proxy.*expire|expired|active.*proxy|connection)/i.test(message);
    const askingReferral = /(referral|refer|ambassador|reward|campaign|\$3|\$10)/i.test(message);
    const askingWallet = /(wallet|deposit|payment|balance|refund|paystack|card)/i.test(message);
    const askingPrice = /(price|cost|how much|plan|duration|7-day|24-hour|30-day)/i.test(message);
    const askingHuman = /(human|agent|person|support ticket|escalate|real person)/i.test(message);

    if (askingAvailability) {
      const country = k.countries.find((row) => row.code === countryCode);
      reply = country && country.available > 0
        ? `${countryName(country.code)} currently has ${country.available} verified proxy seat${country.available === 1 ? "" : "s"} available. Open Dashboard → Marketplace, choose ${countryName(country.code)}, then select a plan. Availability is checked again at checkout.`
        : `Sorry, there are currently no proxies available for ${countryName(countryCode)}. Please select another country in Dashboard → Marketplace.`;
    } else if (askingProxyStatus) {
      const rows = await db.query<{ productName: string; status: string; expiresAt: Date; label: string }>(
        `select p.name as "productName", a.status, a.expires_at as "expiresAt", i.label
           from proxy_allocations a join products p on p.id=a.product_id
           join proxy_inventory i on i.id=a.proxy_inventory_id
          where a.user_id=$1 order by a.activated_at desc limit 3`,
        [input.userId],
      );
      if (rows.rows.length === 0) {
        reply = "I don’t see a proxy allocation on your account yet. If you have purchased a plan, open Dashboard → My proxies and check the order status. If the order was refunded, the wallet credit is shown in your transaction history.";
      } else {
        reply = rows.rows.map((row) => `• ${row.productName} — ${row.status === "active" && new Date(row.expiresAt) > new Date() ? "active" : row.status}, expires ${date(row.expiresAt)} (WAT).`).join("\n") + "\n\nOpen Dashboard → My proxies to view the connection details. I can’t display proxy passwords here.";
      }
    } else if (askingReferral) {
      const referrals = await db.query<{ status: string; rewardMinor: number | null; createdAt: Date }>(
        `select status, reward_amount_minor::bigint as "rewardMinor", created_at as "createdAt" from referrals where referrer_id=$1 order by created_at desc limit 5`,
        [input.userId],
      );
      if (referrals.rows.length > 0) {
        const rewarded = referrals.rows.filter((row) => row.status === "rewarded").length;
        reply = `You have ${referrals.rows.length} referral${referrals.rows.length === 1 ? "" : "s"} recorded; ${rewarded} have been rewarded. A referral qualifies after a verified deposit and a completed 7-day-or-longer proxy purchase. Open Dashboard → Refer & earn for the exact status.`;
      } else {
        reply = "I don’t see a referral on your account yet. Every customer gets a code in Dashboard → Refer & earn. A referral needs a verified deposit and a completed 7-day+ proxy purchase to qualify.";
      }
    } else if (askingWallet) {
      const wallet = await getWalletSummary(input.userId);
      const deposits = await db.query<{ amountMinor: number; status: string; createdAt: Date }>(
        `select amount_minor::bigint as "amountMinor", status, created_at as "createdAt" from deposits where user_id=$1 order by created_at desc limit 2`,
        [input.userId],
      );
      const latest = deposits.rows[0];
      reply = `Your BUYBIZ wallet balance is ${naira(wallet.balanceMinor)}.${latest ? ` Your latest deposit is ${naira(Number(latest.amountMinor))} with status ${latest.status}.` : ""} Wallet funds are internal BUYBIZ credit, not cash. If a payment is pending, check Dashboard → Wallet before paying again.`;
    } else if (askingPrice) {
      const products = k.products.map((row) => `• ${row.name} — ${naira(Number(row.priceMinor))}`).join("\n");
      reply = `Current proxy plans:\n${products}\n\nChoose a country in the marketplace. Prices are paid from your wallet and access expires at the timestamp shown after allocation.`;
    } else if (k.campaign && !askingHuman) {
      reply = `${k.campaign.name}: the qualifying customer earns $${(k.campaign.customerRewardCents / 100).toFixed(0)} and a valid referrer earns $${(k.campaign.referrerRewardCents / 100).toFixed(0)} after a completed proxy purchase of ${k.campaign.qualifyingProxyDays} days or more during the campaign. Payout is ${date(k.campaign.payoutAt)}. The $3 Ambassador programme is ongoing with no end date; its next payout is ${date(k.ambassador?.nextPayoutAt)} after 10 qualified referrals.`;
    } else if (askingHuman) {
      const ticket = await createSupportTicket({
        userId: input.userId,
        subject: `AI support escalation: ${message.slice(0, 80)}`,
        category: "general",
        priority: "normal",
        message: `Customer requested human help.\n\nConversation:\n${message}`,
      });
      ticketNumber = ticket.ticketNumber;
      reply = `I’ve created ticket ${ticket.ticketNumber} for a human support agent. You can follow it in Dashboard → Support.`;
      await db.query(`update ai_support_conversations set status='escalated', updated_at=now() where id=$1`, [conversationId]);
    } else {
      reply = "I don’t have enough information to answer that safely. I can help with proxy availability, your proxy status, wallet deposits, plans, referrals and campaign rules. For an account-specific issue, open Dashboard → Support and a human will reply.";
    }
  }

  await db.query(`insert into ai_support_messages (conversation_id,user_id,role,body) values ($1,$2,'assistant',$3)`, [conversationId, input.userId, reply]);
  await db.query(`update ai_support_conversations set updated_at=now() where id=$1`, [conversationId]);
  return { reply, conversationId, ticketNumber, flagged };
}

export async function getAiSupportConversations() {
  const db = await getDb();
  const rows = await db.query<{ id: string; username: string; email: string; status: string; flagged: boolean; updatedAt: Date; count: number }>(
    `select c.id, p.username, p.email, c.status, c.flagged, c.updated_at as "updatedAt",
            count(m.id)::int as count
       from ai_support_conversations c join profiles p on p.id=c.user_id
       left join ai_support_messages m on m.conversation_id=c.id
      group by c.id,p.username,p.email order by c.updated_at desc limit 50`,
  );
  return rows.rows;
}
