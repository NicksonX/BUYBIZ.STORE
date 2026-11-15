import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import type {
  Allocation,
  Deposit,
  LedgerEntry,
  Notification,
  OrderDetail,
  OrderStatus,
  PlanAvailability,
  Product,
  SupportMessage,
  SupportTicket,
} from "@/lib/db/types";
import { getPlanAvailability } from "@/server/data/products";

export type CustomerAllocationRow = {
  id: string;
  productName: string;
  productSlug: string;
  status: "active" | "expired" | "interrupted" | "revoked" | "terminated";
  activatedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  interruptionReason: string | null;
  proxyLabel: string;
  protocol: string;
  host: string;
  port: number;
  region: string | null;
  inventoryExpiresAt: Date;
  inventoryStatus: string;
  maxSeats: number;
  accessType: "shared" | "single";
  orderNumber: string;
  durationSeconds: number | null;
};

export type WalletSummary = {
  balanceMinor: number;
  totalDepositedMinor: number;
  totalSpentMinor: number;
  totalRefundedMinor: number;
  entryCount: number;
};

export type TicketWithCount = SupportTicket & { messageCount: number };

async function getWalletSummaryUncached(userId: string): Promise<WalletSummary> {
  const db = await getDb();
  const result = await db.query<{
    balanceMinor: number;
    totalDepositedMinor: number;
    totalSpentMinor: number;
    totalRefundedMinor: number;
    entryCount: number;
  }>(
    `select
       coalesce(sum(amount_minor), 0)::int as "balanceMinor",
       coalesce(sum(case when entry_type = 'deposit_credit' then amount_minor else 0 end), 0)::int as "totalDepositedMinor",
       coalesce(sum(case when entry_type = 'purchase_debit' then -amount_minor else 0 end), 0)::int as "totalSpentMinor",
       coalesce(sum(case when entry_type = 'refund_credit' then amount_minor else 0 end), 0)::int as "totalRefundedMinor",
       count(*)::int as "entryCount"
     from wallet_ledger
     where user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return {
    balanceMinor: Number(row?.balanceMinor ?? 0),
    totalDepositedMinor: Number(row?.totalDepositedMinor ?? 0),
    totalSpentMinor: Number(row?.totalSpentMinor ?? 0),
    totalRefundedMinor: Number(row?.totalRefundedMinor ?? 0),
    entryCount: Number(row?.entryCount ?? 0),
  };
}

async function getDashboardCountsUncached(userId: string) {
  const db = await getDb();
  const result = await db.query<{
    totalOrders: number;
    activeProxies: number;
    openTickets: number;
    unreadNotifications: number;
  }>(
    `select
       (select count(*)::int from orders where user_id = $1) as "totalOrders",
       (select count(*)::int from proxy_allocations
          where user_id = $1 and status = 'active' and expires_at > now()) as "activeProxies",
       (select count(*)::int from support_tickets
          where user_id = $1 and status in ('open','pending')) as "openTickets",
       (select count(*)::int from notifications
          where user_id = $1 and read_at is null) as "unreadNotifications"`,
    [userId],
  );
  return result.rows[0] ?? {
    totalOrders: 0,
    activeProxies: 0,
    openTickets: 0,
    unreadNotifications: 0,
  };
}

async function getRecentLedgerUncached(
  userId: string,
  limit = 5,
): Promise<LedgerEntry[]> {
  const db = await getDb();
  const result = await db.query<LedgerEntry & { orderNumber: string | null }>(
    `select l.id, l.user_id as "userId", l.entry_type as "entryType",
            l.amount_minor as "amountMinor", l.balance_after_minor as "balanceAfterMinor",
            l.currency, l.reference, l.related_order_id as "relatedOrderId",
            l.related_deposit_id as "relatedDepositId", l.description,
            l.created_at as "createdAt", o.order_number as "orderNumber"
       from wallet_ledger l
       left join orders o on o.id = l.related_order_id
      where l.user_id = $1
      order by l.created_at desc
      limit $2`,
    [userId, limit],
  );
  return result.rows;
}

async function getActivitySeriesUncached(userId: string) {
  const db = await getDb();
  const result = await db.query<{
    date: string;
    spendMinor: number;
    creditMinor: number;
  }>(
    `with days as (
       select generate_series(
         (current_date - interval '29 days')::date,
         current_date::date,
         interval '1 day'
       )::date as day
     ),
     daily as (
       select created_at::date as day,
              sum(case when amount_minor < 0 then -amount_minor else 0 end)::int as spend,
              sum(case when amount_minor > 0 then amount_minor else 0 end)::int as credit
         from wallet_ledger
        where user_id = $1
          and created_at >= current_date - interval '29 days'
        group by 1
     )
     select to_char(days.day, 'YYYY-MM-DD') as date,
            coalesce(daily.spend, 0) as "spendMinor",
            coalesce(daily.credit, 0) as "creditMinor"
       from days
       left join daily on daily.day = days.day
      order by days.day asc`,
    [userId],
  );
  return result.rows.map((row) => ({
    date: row.date,
    spendMinor: Number(row.spendMinor),
    creditMinor: Number(row.creditMinor),
  }));
}

async function getActiveAllocationsUncached(
  userId: string,
  limit = 4,
): Promise<CustomerAllocationRow[]> {
  const db = await getDb();
  const result = await db.query<CustomerAllocationRow>(
    `select a.id, p.name as "productName", p.slug as "productSlug", a.status,
            a.activated_at as "activatedAt", a.expires_at as "expiresAt",
            a.ended_at as "endedAt", a.interruption_reason as "interruptionReason",
            i.label as "proxyLabel", i.protocol, i.host, i.port, i.region,
            i.upstream_expires_at as "inventoryExpiresAt",
            i.status as "inventoryStatus", i.max_seats as "maxSeats", i.access_type as "accessType",
            o.order_number as "orderNumber",
            p.duration_seconds as "durationSeconds"
       from proxy_allocations a
       join proxy_inventory i on i.id = a.proxy_inventory_id
       join products p on p.id = a.product_id
       join orders o on o.id = a.order_id
      where a.user_id = $1 and a.status = 'active' and a.expires_at > now()
      order by a.expires_at asc
      limit $2`,
    [userId, limit],
  );
  return result.rows;
}

export async function getAllocationsForUser(
  userId: string,
  filter: "all" | "active" | "expired" | "terminated" | "interrupted" = "all",
  limit = 50,
): Promise<CustomerAllocationRow[]> {
  const db = await getDb();
  const filterSql =
    filter === "active"
      ? "and a.status = 'active' and a.expires_at > now()"
      : filter === "expired"
        ? "and (a.status = 'expired' or (a.status = 'active' and a.expires_at <= now()))"
        : filter === "terminated"
          ? "and a.status = 'terminated'"
          : filter === "interrupted"
            ? "and a.status in ('interrupted','revoked')"
            : "";
  const result = await db.query<CustomerAllocationRow>(
    `select a.id, p.name as "productName", p.slug as "productSlug", a.status,
            a.activated_at as "activatedAt", a.expires_at as "expiresAt",
            a.ended_at as "endedAt", a.interruption_reason as "interruptionReason",
            i.label as "proxyLabel", i.protocol, i.host, i.port, i.region,
            i.upstream_expires_at as "inventoryExpiresAt",
            i.status as "inventoryStatus", i.max_seats as "maxSeats", i.access_type as "accessType",
            o.order_number as "orderNumber",
            p.duration_seconds as "durationSeconds"
       from proxy_allocations a
       join proxy_inventory i on i.id = a.proxy_inventory_id
       join products p on p.id = a.product_id
       join orders o on o.id = a.order_id
      where a.user_id = $1 ${filterSql}
      order by a.expires_at desc
      limit $2`,
    [userId, limit],
  );
  return result.rows;
}

export async function getAllocationDetail(
  userId: string,
  allocationId: string,
) {
  const db = await getDb();
  const result = await db.query<
    CustomerAllocationRow & {
      encryptedUsername: string | null;
      encryptedPassword: string | null;
      orderId: string;
      productId: string;
      productPriceMinor: number;
    }
  >(
    `select a.id, p.name as "productName", p.slug as "productSlug", a.status,
            a.activated_at as "activatedAt", a.expires_at as "expiresAt",
            a.ended_at as "endedAt", a.interruption_reason as "interruptionReason",
            i.label as "proxyLabel", i.protocol, i.host, i.port, i.region,
            i.upstream_expires_at as "inventoryExpiresAt",
            i.status as "inventoryStatus", i.max_seats as "maxSeats", i.access_type as "accessType",
            i.encrypted_username as "encryptedUsername",
            i.encrypted_password as "encryptedPassword",
            o.order_number as "orderNumber", o.id as "orderId",
            p.id as "productId", p.duration_seconds as "durationSeconds",
            p.price_minor as "productPriceMinor"
       from proxy_allocations a
       join proxy_inventory i on i.id = a.proxy_inventory_id
       join products p on p.id = a.product_id
       join orders o on o.id = a.order_id
      where a.id = $1 and a.user_id = $2
      limit 1`,
    [allocationId, userId],
  );
  return result.rows[0] ?? null;
}

export async function getOrdersForUser(userId: string): Promise<OrderDetail[]> {
  const db = await getDb();
  const result = await db.query<OrderDetail>(
    `select o.id, o.order_number as "orderNumber", o.user_id as "userId",
            o.product_id as "productId", o.amount_minor as "amountMinor",
            o.currency, o.status, o.failure_reason as "failureReason",
            o.idempotency_key as "idempotencyKey", o.created_at as "createdAt",
            o.completed_at as "completedAt", p.name as "productName",
            p.slug as "productSlug", p.duration_seconds as "durationSeconds",
            pr.username, pr.email,
            a.id as "allocationId", a.status as "allocationStatus",
            a.expires_at as "allocationExpiresAt"
       from orders o
       join products p on p.id = o.product_id
       join profiles pr on pr.id = o.user_id
       left join proxy_allocations a on a.order_id = o.id
      where o.user_id = $1
      order by o.created_at desc
      limit 100`,
    [userId],
  );
  return result.rows;
}

export async function getOrderDetail(userId: string, orderId: string) {
  const db = await getDb();
  const orderResult = await db.query<OrderDetail>(
    `select o.id, o.order_number as "orderNumber", o.user_id as "userId",
            o.product_id as "productId", o.amount_minor as "amountMinor",
            o.currency, o.status, o.failure_reason as "failureReason",
            o.idempotency_key as "idempotencyKey", o.created_at as "createdAt",
            o.completed_at as "completedAt", p.name as "productName",
            p.slug as "productSlug", p.duration_seconds as "durationSeconds",
            pr.username, pr.email,
            a.id as "allocationId", a.status as "allocationStatus",
            a.expires_at as "allocationExpiresAt"
       from orders o
       join products p on p.id = o.product_id
       join profiles pr on pr.id = o.user_id
       left join proxy_allocations a on a.order_id = o.id
      where o.id = $1 and o.user_id = $2
      limit 1`,
    [orderId, userId],
  );
  if (!orderResult.rows[0]) return null;
  const ledger = await db.query<LedgerEntry>(
    `select id, user_id as "userId", entry_type as "entryType",
            amount_minor as "amountMinor", balance_after_minor as "balanceAfterMinor",
            currency, reference, related_order_id as "relatedOrderId",
            related_deposit_id as "relatedDepositId", description,
            created_at as "createdAt"
       from wallet_ledger where related_order_id = $1 order by created_at asc`,
    [orderId],
  );
  return { order: orderResult.rows[0], ledger: ledger.rows };
}

export async function getLedgerForUser(
  userId: string,
  limit = 100,
): Promise<LedgerEntry[]> {
  return getRecentLedger(userId, limit);
}

async function getDepositsForUserUncached(userId: string): Promise<Deposit[]> {
  const db = await getDb();
  const result = await db.query<Deposit>(
    `select id, user_id as "userId", provider,
            provider_reference as "providerReference",
            amount_minor as "amountMinor", currency, status,
            provider_transaction_id as "providerTransactionId",
            gateway_fee_minor as "gatewayFeeMinor",
            authorization_url as "authorizationUrl", channel,
            verified_at as "verifiedAt", credited_at as "creditedAt",
            created_at as "createdAt", updated_at as "updatedAt"
       from deposits where user_id = $1 order by created_at desc limit 50`,
    [userId],
  );
  return result.rows;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const db = await getDb();
  const result = await db.query<Notification>(
    `select id, user_id as "userId", type, title, body, href,
            read_at as "readAt", created_at as "createdAt"
       from notifications where user_id = $1 order by created_at desc limit 60`,
    [userId],
  );
  return result.rows;
}

export async function getUnreadNotificationCount(userId: string) {
  const db = await getDb();
  const result = await db.query<{ count: number }>(
    `select count(*)::int as count from notifications where user_id = $1 and read_at is null`,
    [userId],
  );
  return result.rows[0]?.count ?? 0;
}

export async function getTicketsForUser(userId: string): Promise<TicketWithCount[]> {
  const db = await getDb();
  const result = await db.query<TicketWithCount>(
    `select t.id, t.ticket_number as "ticketNumber", t.user_id as "userId",
            t.subject, t.category, t.priority, t.status,
            t.last_message_at as "lastMessageAt", t.closed_at as "closedAt",
            t.created_at as "createdAt", t.updated_at as "updatedAt",
            (select count(*)::int from support_messages m where m.ticket_id = t.id) as "messageCount"
       from support_tickets t where t.user_id = $1
      order by t.last_message_at desc limit 50`,
    [userId],
  );
  return result.rows;
}

export async function getTicketForUser(userId: string, ticketId: string) {
  const db = await getDb();
  const ticketResult = await db.query<TicketWithCount>(
    `select t.id, t.ticket_number as "ticketNumber", t.user_id as "userId",
            t.subject, t.category, t.priority, t.status,
            t.last_message_at as "lastMessageAt", t.closed_at as "closedAt",
            t.created_at as "createdAt", t.updated_at as "updatedAt",
            (select count(*)::int from support_messages m where m.ticket_id = t.id) as "messageCount"
       from support_tickets t where t.id = $1 and t.user_id = $2 limit 1`,
    [ticketId, userId],
  );
  if (!ticketResult.rows[0]) return null;
  const messages = await db.query<SupportMessage>(
    `select m.id, m.ticket_id as "ticketId",
            m.author_user_id as "authorUserId", m.is_staff as "isStaff",
            m.body, m.created_at as "createdAt",
            p.display_name as "authorName", p.role as "authorRole"
       from support_messages m
       left join profiles p on p.id = m.author_user_id
      where m.ticket_id = $1 order by m.created_at asc`,
    [ticketId],
  );
  return { ticket: ticketResult.rows[0], messages: messages.rows };
}

export async function getCheckoutData(userId: string, slug: string, countryCode?: string) {
  const plans = await getPlanAvailability(countryCode);
  const selected = plans.find((plan) => plan.product.slug === slug);
  const wallet = await getWalletSummary(userId);
  return { plan: selected ?? null, wallet, plans };
}

export async function getPublicPlanBySlug(
  slug: string,
): Promise<PlanAvailability | null> {
  const plans = await getPlanAvailability();
  return plans.find((plan) => plan.product.slug === slug) ?? null;
}

export async function getAvailablePlans(countryCode?: string): Promise<PlanAvailability[]> {
  return getPlanAvailability(countryCode);
}

export async function searchCustomerData(userId: string, query: string) {
  const db = await getDb();
  const term = `%${query.replace(/[%_]/g, "")}%`;
  const [orders, allocations, tickets] = await Promise.all([
    db.query<{
      id: string;
      orderNumber: string;
      status: OrderStatus;
      productName: string;
      amountMinor: number;
      createdAt: Date;
    }>(
      `select o.id, o.order_number as "orderNumber", o.status,
              p.name as "productName", o.amount_minor as "amountMinor",
              o.created_at as "createdAt"
         from orders o join products p on p.id = o.product_id
        where o.user_id = $1
          and (o.order_number ilike $2 or p.name ilike $2)
        order by o.created_at desc limit 5`,
      [userId, term],
    ),
    db.query<{
      id: string;
      status: string;
      productName: string;
      proxyLabel: string;
      expiresAt: Date;
    }>(
      `select a.id, a.status, p.name as "productName",
              i.label as "proxyLabel", a.expires_at as "expiresAt"
         from proxy_allocations a
         join products p on p.id = a.product_id
         join proxy_inventory i on i.id = a.proxy_inventory_id
        where a.user_id = $1
          and (p.name ilike $2 or i.label ilike $2 or i.region ilike $2)
        order by a.activated_at desc limit 5`,
      [userId, term],
    ),
    db.query<{
      id: string;
      ticketNumber: string;
      subject: string;
      status: string;
      lastMessageAt: Date;
    }>(
      `select id, ticket_number as "ticketNumber", subject, status,
              last_message_at as "lastMessageAt"
         from support_tickets
        where user_id = $1 and (subject ilike $2 or ticket_number ilike $2)
        order by last_message_at desc limit 5`,
      [userId, term],
    ),
  ]);
  return {
    orders: orders.rows,
    allocations: allocations.rows,
    tickets: tickets.rows,
  };
}

export async function getReferralDashboard(userId: string) {
  const db = await getDb();
  const profile = await db.query<{ referralCode: string | null }>(
    `select referral_code as "referralCode" from profiles where id = $1 limit 1`,
    [userId],
  );
  const rows = await db.query<{
    id: string;
    status: string;
    rewardMinor: number | null;
    createdAt: Date;
    rewardedAt: Date | null;
    refereeUsername: string;
    ambassadorQualifiedAt: Date | null;
    qualifyingOrderId: string | null;
    qualifyingPurchaseAt: Date | null;
    qualifyingDurationSeconds: number | null;
  }>(
    `select r.id, r.status, r.reward_amount_minor::bigint as "rewardMinor",
            r.created_at as "createdAt", r.rewarded_at as "rewardedAt",
            r.ambassador_qualified_at as "ambassadorQualifiedAt",
            r.qualifying_order_id as "qualifyingOrderId",
            r.qualifying_purchase_at as "qualifyingPurchaseAt",
            r.qualifying_duration_seconds as "qualifyingDurationSeconds",
            p.username as "refereeUsername"
       from referrals r
       join profiles p on p.id = r.referee_id
      where r.referrer_id = $1
      order by r.created_at desc limit 100`,
    [userId],
  );
  const referrals = rows.rows.map((row) => ({
    ...row,
    rewardMinor: row.rewardMinor === null ? null : Number(row.rewardMinor),
  }));
  const duration = await db.query<{ seconds: unknown }>(
    `select coalesce(
       (select (value #>> '{}')::int from app_settings
         where key='referral_qualifying_proxy_duration_seconds'),
       604800
     ) as seconds`,
  );
  const minProxyDays = Math.max(
    1,
    Math.ceil(Number(duration.rows[0]?.seconds ?? 604_800) / 86_400),
  );
  const rewarded = referrals.filter((row) => row.status === "rewarded");
  return {
    code: profile.rows[0]?.referralCode ?? "",
    referrals,
    minProxyDays,
    stats: {
      total: referrals.length,
      registered: referrals.filter((row) => row.status === "registered").length,
      pending: referrals.filter((row) => row.status === "pending").length,
      qualified: referrals.filter((row) => row.status === "qualified").length,
      rejected: referrals.filter((row) => row.status === "rejected").length,
      rewarded: rewarded.length,
      earnedMinor: rewarded.reduce((sum, row) => sum + (row.rewardMinor ?? 0), 0),
    },
  };
}


// React request-level caching. These functions are called by both a layout and
// its page; caching removes duplicate database round-trips in the same render.
export const getWalletSummary = cache(getWalletSummaryUncached);
export const getDashboardCounts = cache(getDashboardCountsUncached);
export const getRecentLedger = cache(getRecentLedgerUncached);
export const getActivitySeries = cache(getActivitySeriesUncached);
export const getActiveAllocations = cache(getActiveAllocationsUncached);
export const getDepositsForUser = cache(getDepositsForUserUncached);

export type WalletTransactionStatus =
  | "completed"
  | "pending"
  | "failed"
  | "refunded"
  | "reversed"
  | "abandoned";

export type WalletTransaction = {
  id: string;
  kind: "ledger" | "deposit";
  title: string;
  createdAt: Date;
  amountMinor: number;
  status: WalletTransactionStatus;
  reference: string;
  copyReference: string;
  method: string | null;
  feeMinor: number;
  relatedOrderId: string | null;
  relatedDepositId: string | null;
  entryType: string | null;
};

const LEDGER_TITLES: Record<string, string> = {
  deposit_credit: "Wallet deposit",
  purchase_debit: "Proxy purchase",
  refund_credit: "Wallet refund",
  admin_credit: "Account credit",
  admin_debit: "Account debit",
  transfer_debit: "Transfer out",
  transfer_credit: "Transfer in",
  referral_credit: "Referral reward",
  reversal: "Reversal",
};

const DEPOSIT_STATUS: Record<string, WalletTransactionStatus> = {
  initiated: "pending",
  pending: "pending",
  failed: "failed",
  abandoned: "abandoned",
  reversed: "reversed",
};

function ledgerStatus(entryType: string): WalletTransactionStatus {
  if (entryType === "refund_credit") return "refunded";
  if (entryType === "reversal") return "reversed";
  return "completed";
}

export type WalletTransactionQuery = {
  offset?: number;
  limit?: number;
  filter?: "all" | "deposits" | "purchases" | "refunds";
  query?: string;
};

export async function getWalletTransactions(
  userId: string,
  input: WalletTransactionQuery = {},
) {
  const db = await getDb();
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const offset = Math.max(0, input.offset ?? 0);
  const filter = input.filter ?? "all";
  const term = (input.query ?? "").trim().toLowerCase();

  const [ledger, deposits] = await Promise.all([
    db.query<{
      id: string;
      entryType: string;
      amountMinor: number;
      description: string;
      createdAt: Date;
      relatedOrderId: string | null;
      relatedDepositId: string | null;
      reference: string;
      orderNumber: string | null;
    }>(
      `select l.id, l.entry_type as "entryType", l.amount_minor::bigint as "amountMinor",
              l.description, l.created_at as "createdAt",
              l.related_order_id as "relatedOrderId",
              l.related_deposit_id as "relatedDepositId",
              l.reference, o.order_number as "orderNumber"
         from wallet_ledger l
         left join orders o on o.id = l.related_order_id
        where l.user_id = $1
        order by l.created_at desc
        limit 400`,
      [userId],
    ),
    db.query<{
      id: string;
      provider: string;
      providerReference: string;
      amountMinor: number;
      status: string;
      channel: string | null;
      gatewayFeeMinor: number;
      createdAt: Date;
    }>(
      `select id, provider, provider_reference as "providerReference",
              amount_minor::bigint as "amountMinor", status, channel,
              gateway_fee_minor::bigint as "gatewayFeeMinor", created_at as "createdAt"
         from deposits
        where user_id = $1
        order by created_at desc
        limit 200`,
      [userId],
    ),
  ]);

  const depositRefs = new Map(
    deposits.rows.map((row) => [row.id, row.providerReference]),
  );
  const items: WalletTransaction[] = [];

  for (const row of ledger.rows) {
    const entryType = String(row.entryType);
    const copyReference =
      (row.relatedDepositId ? depositRefs.get(row.relatedDepositId) : null) ??
      row.orderNumber ??
      row.reference;
    items.push({
      id: `ledger:${row.id}`,
      kind: "ledger",
      title: LEDGER_TITLES[entryType] ?? row.description,
      createdAt: new Date(row.createdAt),
      amountMinor: Number(row.amountMinor),
      status: ledgerStatus(entryType),
      reference: row.reference,
      copyReference,
      method: null,
      feeMinor: 0,
      relatedOrderId: row.relatedOrderId,
      relatedDepositId: row.relatedDepositId,
      entryType,
    });
  }

  for (const row of deposits.rows) {
    if (row.status === "credited" || row.status === "successful") continue;
    items.push({
      id: `deposit:${row.id}`,
      kind: "deposit",
      title: "Wallet deposit",
      createdAt: new Date(row.createdAt),
      amountMinor: Number(row.amountMinor),
      status: DEPOSIT_STATUS[row.status] ?? "pending",
      reference: row.providerReference,
      copyReference: row.providerReference,
      method: row.provider === "demo" ? null : row.channel,
      feeMinor: Number(row.gatewayFeeMinor),
      relatedOrderId: null,
      relatedDepositId: row.id,
      entryType: null,
    });
  }

  items.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const filtered = items.filter((item) => {
    if (filter === "deposits") {
      return item.kind === "deposit" || item.entryType === "deposit_credit";
    }
    if (filter === "purchases") return item.entryType === "purchase_debit";
    if (filter === "refunds") {
      return item.entryType === "refund_credit" || item.entryType === "reversal";
    }
    if (term) {
      return [item.title, item.copyReference]
        .join(" ")
        .toLowerCase()
        .includes(term);
    }
    return true;
  });

  const page = filtered.slice(offset, offset + limit);
  return {
    items: page,
    nextOffset: offset + limit < filtered.length ? offset + limit : null,
    total: filtered.length,
  };
}
