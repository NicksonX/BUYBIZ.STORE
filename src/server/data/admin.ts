import "server-only";
import { getDb } from "@/lib/db";
import type { SqlParam } from "@/lib/db/driver";
import type {
  AllocationStatus,
  AppSettings,
  AuditLog,
  Deposit,
  DepositStatus,
  Expense,
  LedgerEntry,
  OrderStatus,
  Product,
  Profile,
  ProxyProtocol,
  ProxyStatus,
  SupportMessage,
  SupportTicket,
  TicketStatus,
  UserRole,
} from "@/lib/db/types";
import { getAppSettings } from "@/server/data/settings";

export type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  status: string;
  emailVerified: boolean;
  createdAt: Date;
  balanceMinor: number;
  orderCount: number;
  activeProxies: number;
};

export type AdminInventoryRow = {
  id: string;
  label: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  region: string | null;
  purchaseCostMinor: number;
  maxSeats: number;
  accessType: "shared" | "single";
  activeSeats: number;
  freeSeats: number;
  uploadedAt: Date;
  upstreamExpiresAt: Date;
  expiryIsEstimated: boolean;
  status: ProxyStatus;
  archivedAt: Date | null;
  createdAt: Date;
};

export type AdminAllocationRow = {
  id: string;
  status: AllocationStatus;
  activatedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  username: string;
  userId: string;
  productName: string;
  inventoryId: string;
  inventoryLabel: string;
  region: string | null;
  orderNumber: string;
  orderId: string;
};

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  amountMinor: number;
  createdAt: Date;
  failureReason: string | null;
  username: string;
  email: string;
  userId: string;
  productName: string;
  allocationId: string | null;
};

export type AdminDepositRow = Deposit & {
  username: string;
  email: string;
};

export type AdminLedgerRow = LedgerEntry & {
  username: string;
  email: string;
  orderNumber: string | null;
  createdByName: string | null;
};

export type AdminTicketRow = SupportTicket & {
  messageCount: number;
};

export type AdminExpenseRow = Expense & {
  proxyLabel: string | null;
  createdByName: string | null;
};

export type AdminAuditRow = AuditLog & {
  actorUsername: string | null;
};

export type AdminOverview = {
  totalUsers: number;
  totalDeposits: number;
  totalSales: number;
  activeAllocations: number;
  availableSeats: number;
  walletLiability: number;
  totalRefunds: number;
  totalExpenses: number;
  gatewayFees: number;
  inventoryCost: number;
  directProxyCost: number;
  openTickets: number;
  pendingDeposits: number;
  totalOrders: number;
  monthlySales: { month: string; totalMinor: number }[];
  packageMix: { name: string; count: number; totalMinor: number }[];
  inventoryUtilization: {
    id: string;
    label: string;
    region: string | null;
    maxSeats: number;
    activeSeats: number;
    status: ProxyStatus;
    expiresAt: Date;
  }[];
};

function amount(value: unknown) {
  return Number(value ?? 0);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const db = await getDb();
  const [metrics, monthly, mix, inventory, directCost] = await Promise.all([
    db.query<{
      totalUsers: number;
      totalDeposits: number;
      totalSales: number;
      activeAllocations: number;
      availableSeats: number;
      walletLiability: number;
      totalRefunds: number;
      totalExpenses: number;
      gatewayFees: number;
      inventoryCost: number;
      openTickets: number;
      pendingDeposits: number;
      totalOrders: number;
    }>(
      `select
         (select count(*)::int from profiles where role = 'customer') as "totalUsers",
         (select coalesce(sum(amount_minor),0)::bigint from deposits where status = 'credited') as "totalDeposits",
         (select coalesce(sum(amount_minor),0)::bigint from orders where status = 'completed') as "totalSales",
         (select count(*)::int from proxy_allocations where status = 'active' and expires_at > now()) as "activeAllocations",
         (
           select coalesce(sum(greatest(i.max_seats - coalesce(s.active,0),0)),0)::int
             from proxy_inventory i
             left join (
               select proxy_inventory_id, count(*)::int as active
                 from proxy_allocations
                where status = 'active' and expires_at > now()
                group by proxy_inventory_id
             ) s on s.proxy_inventory_id = i.id
            where i.status in ('available','full') and i.archived_at is null
              and i.upstream_expires_at > now()
         ) as "availableSeats",
         (select coalesce(sum(amount_minor),0)::bigint from wallet_ledger) as "walletLiability",
         (select coalesce(sum(amount_minor),0)::bigint from wallet_ledger where entry_type = 'refund_credit') as "totalRefunds",
         (select coalesce(sum(amount_minor),0)::bigint from expenses) as "totalExpenses",
         (select coalesce(sum(gateway_fee_minor),0)::bigint from deposits where status = 'credited') as "gatewayFees",
         (select coalesce(sum(purchase_cost_minor),0)::bigint from proxy_inventory) as "inventoryCost",
         (select count(*)::int from support_tickets where status in ('open','pending')) as "openTickets",
         (select count(*)::int from deposits where status in ('pending','initiated')) as "pendingDeposits",
         (select count(*)::int from orders) as "totalOrders"`,
    ),
    db.query<{ month: string; totalMinor: number }>(
      `select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
              coalesce(sum(amount_minor),0)::bigint as "totalMinor"
         from orders
        where status = 'completed'
          and created_at >= date_trunc('month', current_date) - interval '5 months'
        group by 1 order by 1`,
    ),
    db.query<{ name: string; count: number; totalMinor: number }>(
      `select p.name, count(o.id)::int as count,
              coalesce(sum(o.amount_minor),0)::bigint as "totalMinor"
         from orders o join products p on p.id = o.product_id
        where o.status = 'completed'
        group by p.name order by count desc`,
    ),
    db.query<AdminOverview["inventoryUtilization"][number]>(
      `select i.id, i.label, i.region, i.max_seats as "maxSeats",
              coalesce(s.active,0)::int as "activeSeats", i.status,
              i.upstream_expires_at as "expiresAt"
         from proxy_inventory i
         left join (
           select proxy_inventory_id, count(*)::int as active
             from proxy_allocations
            where status = 'active' and expires_at > now()
            group by proxy_inventory_id
         ) s on s.proxy_inventory_id = i.id
        where i.archived_at is null
        order by coalesce(s.active,0) desc, i.uploaded_at desc
        limit 6`,
    ),
    db.query<{ directProxyCost: number }>(
      `select coalesce(sum(i.purchase_cost_minor),0)::bigint as "directProxyCost"
         from proxy_inventory i
        where exists (
          select 1 from proxy_allocations a where a.proxy_inventory_id = i.id
        )`,
    ),
  ]);

  const m = metrics.rows[0];
  return {
    totalUsers: Number(m?.totalUsers ?? 0),
    totalDeposits: amount(m?.totalDeposits),
    totalSales: amount(m?.totalSales),
    activeAllocations: Number(m?.activeAllocations ?? 0),
    availableSeats: Number(m?.availableSeats ?? 0),
    walletLiability: amount(m?.walletLiability),
    totalRefunds: amount(m?.totalRefunds),
    totalExpenses: amount(m?.totalExpenses),
    gatewayFees: amount(m?.gatewayFees),
    inventoryCost: amount(m?.inventoryCost),
    directProxyCost: amount(directCost.rows[0]?.directProxyCost),
    openTickets: Number(m?.openTickets ?? 0),
    pendingDeposits: Number(m?.pendingDeposits ?? 0),
    totalOrders: Number(m?.totalOrders ?? 0),
    monthlySales: monthly.rows.map((row) => ({
      month: row.month,
      totalMinor: amount(row.totalMinor),
    })),
    packageMix: mix.rows.map((row) => ({
      name: row.name,
      count: Number(row.count),
      totalMinor: amount(row.totalMinor),
    })),
    inventoryUtilization: inventory.rows.map((row) => ({
      ...row,
      maxSeats: Number(row.maxSeats),
      activeSeats: Number(row.activeSeats),
    })),
  };
}

export async function getAdminRecentOrders(limit = 6) {
  const db = await getDb();
  const result = await db.query<AdminOrderRow>(
    `select o.id, o.order_number as "orderNumber", o.status,
            o.amount_minor as "amountMinor", o.created_at as "createdAt",
            o.failure_reason as "failureReason",
            pr.username, pr.email, pr.id as "userId",
            p.name as "productName", a.id as "allocationId"
       from orders o
       join profiles pr on pr.id = o.user_id
       join products p on p.id = o.product_id
       left join proxy_allocations a on a.order_id = o.id
      order by o.created_at desc limit $1`,
    [limit],
  );
  return result.rows;
}

export async function getAdminRecentDeposits(limit = 6) {
  const db = await getDb();
  const result = await db.query<AdminDepositRow>(
    `select d.id, d.user_id as "userId", d.provider,
            d.provider_reference as "providerReference",
            d.amount_minor as "amountMinor", d.currency, d.status,
            d.provider_transaction_id as "providerTransactionId",
            d.gateway_fee_minor as "gatewayFeeMinor",
            d.authorization_url as "authorizationUrl", d.channel,
            d.verified_at as "verifiedAt", d.credited_at as "creditedAt",
            d.created_at as "createdAt", d.updated_at as "updatedAt",
            p.username, p.email
       from deposits d join profiles p on p.id = d.user_id
      order by d.created_at desc limit $1`,
    [limit],
  );
  return result.rows;
}

export async function getAdminUsers(input: {
  q?: string;
  role?: string;
  status?: string;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: SqlParam[] = [];
  let index = 1;
  if (input.q) {
    clauses.push(`(p.username ilike $${index} or p.email ilike $${index})`);
    params.push(`%${input.q}%`);
    index += 1;
  }
  if (input.role && input.role !== "all") {
    clauses.push(`p.role = $${index}`);
    params.push(input.role);
    index += 1;
  }
  if (input.status && input.status !== "all") {
    clauses.push(`p.status = $${index}`);
    params.push(input.status);
    index += 1;
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const totalResult = await db.query<{ total: number }>(
    `select count(*)::int as total from profiles p ${where}`,
    params,
  );
  const limit = input.pageSize;
  const offset = (input.page - 1) * input.pageSize;
  const result = await db.query<AdminUserRow>(
    `select p.id, p.username, p.email,
            p.display_name as "displayName", p.role, p.status,
            p.email_verified as "emailVerified",
            p.created_at as "createdAt",
            coalesce(w.balance,0)::bigint as "balanceMinor",
            coalesce(o.cnt,0)::int as "orderCount",
            coalesce(a.cnt,0)::int as "activeProxies"
       from profiles p
       left join lateral (
         select sum(amount_minor) as balance from wallet_ledger l where l.user_id = p.id
       ) w on true
       left join lateral (
         select count(*)::int as cnt from orders x where x.user_id = p.id
       ) o on true
       left join lateral (
         select count(*)::int as cnt from proxy_allocations x
          where x.user_id = p.id and x.status = 'active' and x.expires_at > now()
       ) a on true
       ${where}
       order by p.created_at desc
       limit $${index} offset $${index + 1}`,
    [...params, limit, offset],
  );
  return {
    items: result.rows.map((row) => ({
      ...row,
      balanceMinor: amount(row.balanceMinor),
    })),
    total: Number(totalResult.rows[0]?.total ?? 0),
  };
}

export async function getAdminUserDetail(userId: string) {
  const db = await getDb();
  const profile = await db.query<Profile>(
    `select id, username, email, display_name as "displayName",
            avatar_url as "avatarUrl", role, status,
            email_verified as "emailVerified",
            onboarding_complete as "onboardingComplete",
            created_at as "createdAt", updated_at as "updatedAt"
       from profiles where id = $1 limit 1`,
    [userId],
  );
  if (!profile.rows[0]) return null;
  const [wallet, orders, allocations, tickets, ledger, audit] = await Promise.all([
    db.query<{ balanceMinor: number; totalDeposits: number; totalSpent: number; totalRefunds: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as "balanceMinor",
              coalesce(sum(case when entry_type='deposit_credit' then amount_minor else 0 end),0)::bigint as "totalDeposits",
              coalesce(sum(case when entry_type='purchase_debit' then -amount_minor else 0 end),0)::bigint as "totalSpent",
              coalesce(sum(case when entry_type='refund_credit' then amount_minor else 0 end),0)::bigint as "totalRefunds"
         from wallet_ledger where user_id = $1`,
      [userId],
    ),
    db.query<AdminOrderRow>(
      `select o.id, o.order_number as "orderNumber", o.status,
              o.amount_minor as "amountMinor", o.created_at as "createdAt",
              o.failure_reason as "failureReason",
              p.username, p.email, p.id as "userId",
              pr.name as "productName", a.id as "allocationId"
         from orders o join profiles p on p.id = o.user_id
         join products pr on pr.id = o.product_id
         left join proxy_allocations a on a.order_id = o.id
        where o.user_id = $1 order by o.created_at desc limit 20`,
      [userId],
    ),
    db.query<AdminAllocationRow>(
      `select a.id, a.status, a.activated_at as "activatedAt",
              a.expires_at as "expiresAt", a.ended_at as "endedAt",
              pr.username, pr.id as "userId", p.name as "productName",
              i.id as "inventoryId", i.label as "inventoryLabel", i.region,
              o.order_number as "orderNumber", o.id as "orderId"
         from proxy_allocations a
         join profiles pr on pr.id = a.user_id
         join products p on p.id = a.product_id
         join proxy_inventory i on i.id = a.proxy_inventory_id
         join orders o on o.id = a.order_id
        where a.user_id = $1 order by a.activated_at desc limit 20`,
      [userId],
    ),
    db.query<AdminTicketRow>(
      `select t.id, t.ticket_number as "ticketNumber", t.user_id as "userId",
              t.subject, t.category, t.priority, t.status,
              t.last_message_at as "lastMessageAt", t.closed_at as "closedAt",
              t.created_at as "createdAt", t.updated_at as "updatedAt",
              (select count(*)::int from support_messages m where m.ticket_id = t.id) as "messageCount"
         from support_tickets t where t.user_id = $1
        order by t.last_message_at desc limit 20`,
      [userId],
    ),
    db.query<AdminLedgerRow>(
      `select l.id, l.user_id as "userId", l.entry_type as "entryType",
              l.amount_minor as "amountMinor", l.balance_after_minor as "balanceAfterMinor",
              l.currency, l.reference, l.related_order_id as "relatedOrderId",
              l.related_deposit_id as "relatedDepositId", l.description,
              l.created_at as "createdAt", p.username, p.email,
              o.order_number as "orderNumber", c.username as "createdByName"
         from wallet_ledger l
         join profiles p on p.id = l.user_id
         left join orders o on o.id = l.related_order_id
         left join profiles c on c.id = l.created_by
        where l.user_id = $1 order by l.created_at desc limit 20`,
      [userId],
    ),
    db.query<AdminAuditRow>(
      `select a.id, a.actor_user_id as "actorUserId", a.actor_role as "actorRole",
              a.action, a.entity_type as "entityType", a.entity_id as "entityId",
              a.metadata, a.ip_address as "ipAddress", a.user_agent as "userAgent",
              a.created_at as "createdAt", p.username as "actorUsername"
         from audit_logs a left join profiles p on p.id = a.actor_user_id
        where a.actor_user_id = $1 order by a.created_at desc limit 20`,
      [userId],
    ),
  ]);
  return {
    profile: profile.rows[0],
    wallet: {
      balanceMinor: amount(wallet.rows[0]?.balanceMinor),
      totalDeposits: amount(wallet.rows[0]?.totalDeposits),
      totalSpent: amount(wallet.rows[0]?.totalSpent),
      totalRefunds: amount(wallet.rows[0]?.totalRefunds),
    },
    orders: orders.rows,
    allocations: allocations.rows,
    tickets: tickets.rows,
    ledger: ledger.rows,
    audit: audit.rows,
  };
}

export async function getAdminInventory(input: {
  q?: string;
  status?: string;
  protocol?: string;
}) {
  const db = await getDb();
  const clauses: string[] = ["i.archived_at is null"];
  const params: SqlParam[] = [];
  let index = 1;
  if (input.q) {
    clauses.push(
      `(i.label ilike $${index} or i.host ilike $${index} or i.region ilike $${index})`,
    );
    params.push(`%${input.q}%`);
    index += 1;
  }
  if (input.status && input.status !== "all") {
    clauses.push(`i.status = $${index}`);
    params.push(input.status);
    index += 1;
  }
  if (input.protocol && input.protocol !== "all") {
    clauses.push(`i.protocol = $${index}`);
    params.push(input.protocol);
    index += 1;
  }
  const result = await db.query<AdminInventoryRow>(
    `select i.id, i.label, i.protocol, i.host, i.port, i.region,
            i.purchase_cost_minor as "purchaseCostMinor",
            i.max_seats as "maxSeats", i.access_type as "accessType",
            coalesce(s.active,0)::int as "activeSeats",
            greatest(i.max_seats - coalesce(s.active,0),0)::int as "freeSeats",
            i.uploaded_at as "uploadedAt",
            i.upstream_expires_at as "upstreamExpiresAt",
            i.expiry_is_estimated as "expiryIsEstimated",
            i.status, i.archived_at as "archivedAt", i.created_at as "createdAt"
       from proxy_inventory i
       left join (
         select proxy_inventory_id, count(*)::int as active
           from proxy_allocations
          where status = 'active' and expires_at > now()
          group by proxy_inventory_id
       ) s on s.proxy_inventory_id = i.id
      where ${clauses.join(" and ")}
      order by
        case i.status
          when 'available' then 0 when 'full' then 1 when 'paused' then 2
          when 'disabled' then 3 else 4 end,
        i.uploaded_at desc
      limit 200`,
    params,
  );
  return result.rows.map((row) => ({
    ...row,
    purchaseCostMinor: amount(row.purchaseCostMinor),
    maxSeats: Number(row.maxSeats),
    activeSeats: Number(row.activeSeats),
    freeSeats: Number(row.freeSeats),
  }));
}

export async function getAdminInventoryDetail(id: string) {
  const db = await getDb();
  const inventory = await db.query<
    AdminInventoryRow & {
      providerNote: string | null;
      adminNotes: string | null;
      expiryIsEstimated: boolean;
      hasCredentials: boolean;
      createdBy: string | null;
    }
  >(
    `select i.id, i.label, i.protocol, i.host, i.port, i.region,
            i.provider_note as "providerNote", i.admin_notes as "adminNotes",
            i.purchase_cost_minor as "purchaseCostMinor",
            i.max_seats as "maxSeats", i.access_type as "accessType",
            coalesce(s.active,0)::int as "activeSeats",
            greatest(i.max_seats - coalesce(s.active,0),0)::int as "freeSeats",
            i.uploaded_at as "uploadedAt",
            i.upstream_expires_at as "upstreamExpiresAt",
            i.expiry_is_estimated as "expiryIsEstimated",
            i.status, i.archived_at as "archivedAt", i.created_at as "createdAt",
            (i.encrypted_username is not null) as "hasCredentials",
            i.created_by as "createdBy"
       from proxy_inventory i
       left join (
         select proxy_inventory_id, count(*)::int as active
           from proxy_allocations
          where status = 'active' and expires_at > now()
          group by proxy_inventory_id
       ) s on s.proxy_inventory_id = i.id
      where i.id = $1 limit 1`,
    [id],
  );
  if (!inventory.rows[0]) return null;
  const allocations = await db.query<AdminAllocationRow>(
    `select a.id, a.status, a.activated_at as "activatedAt",
            a.expires_at as "expiresAt", a.ended_at as "endedAt",
            p.username, p.id as "userId", pr.name as "productName",
            i.id as "inventoryId", i.label as "inventoryLabel", i.region,
            o.order_number as "orderNumber", o.id as "orderId"
       from proxy_allocations a
       join profiles p on p.id = a.user_id
       join products pr on pr.id = a.product_id
       join proxy_inventory i on i.id = a.proxy_inventory_id
       join orders o on o.id = a.order_id
      where a.proxy_inventory_id = $1 order by a.activated_at desc limit 50`,
    [id],
  );
  return {
    inventory: {
      ...inventory.rows[0],
      purchaseCostMinor: amount(inventory.rows[0].purchaseCostMinor),
      activeSeats: Number(inventory.rows[0].activeSeats),
      freeSeats: Number(inventory.rows[0].freeSeats),
    },
    allocations: allocations.rows,
  };
}

export async function getAdminAllocations(input: {
  status?: string;
  q?: string;
}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: SqlParam[] = [];
  let index = 1;
  if (input.status && input.status !== "all") {
    if (input.status === "active") {
      clauses.push(`a.status = 'active' and a.expires_at > now()`);
    } else if (input.status === "expired") {
      clauses.push(`(a.status = 'expired' or (a.status = 'active' and a.expires_at <= now()))`);
    } else {
      clauses.push(`a.status = $${index}`);
      params.push(input.status);
      index += 1;
    }
  }
  if (input.q) {
    clauses.push(
      `(p.username ilike $${index} or i.label ilike $${index} or o.order_number ilike $${index})`,
    );
    params.push(`%${input.q}%`);
    index += 1;
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const result = await db.query<AdminAllocationRow>(
    `select a.id, a.status, a.activated_at as "activatedAt",
            a.expires_at as "expiresAt", a.ended_at as "endedAt",
            p.username, p.id as "userId", pr.name as "productName",
            i.id as "inventoryId", i.label as "inventoryLabel", i.region,
            o.order_number as "orderNumber", o.id as "orderId"
       from proxy_allocations a
       join profiles p on p.id = a.user_id
       join products pr on pr.id = a.product_id
       join proxy_inventory i on i.id = a.proxy_inventory_id
       join orders o on o.id = a.order_id
       ${where}
      order by a.activated_at desc limit 200`,
    params,
  );
  return result.rows;
}

export async function getAdminProducts() {
  const db = await getDb();
  const result = await db.query<Product>(
    `select id, slug, name, description, category,
            duration_seconds as "durationSeconds",
            price_minor as "priceMinor", currency,
            is_active as "isActive", is_coming_soon as "isComingSoon",
            features, sort_order as "sortOrder"
       from products order by sort_order asc`,
  );
  return result.rows.map((row) => ({
    ...row,
    priceMinor: amount(row.priceMinor),
    features: Array.isArray(row.features) ? row.features : [],
  }));
}

export async function getAdminOrders(input: {
  q?: string;
  status?: string;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: SqlParam[] = [];
  let index = 1;
  if (input.q) {
    clauses.push(
      `(o.order_number ilike $${index} or p.username ilike $${index} or p.email ilike $${index})`,
    );
    params.push(`%${input.q}%`);
    index += 1;
  }
  if (input.status && input.status !== "all") {
    clauses.push(`o.status = $${index}`);
    params.push(input.status);
    index += 1;
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const total = await db.query<{ total: number }>(
    `select count(*)::int as total from orders o
       join profiles p on p.id = o.user_id ${where}`,
    params,
  );
  const result = await db.query<AdminOrderRow>(
    `select o.id, o.order_number as "orderNumber", o.status,
            o.amount_minor as "amountMinor", o.created_at as "createdAt",
            o.failure_reason as "failureReason",
            p.username, p.email, p.id as "userId",
            pr.name as "productName", a.id as "allocationId"
       from orders o
       join profiles p on p.id = o.user_id
       join products pr on pr.id = o.product_id
       left join proxy_allocations a on a.order_id = o.id
       ${where}
      order by o.created_at desc
      limit $${index} offset $${index + 1}`,
    [...params, input.pageSize, (input.page - 1) * input.pageSize],
  );
  return {
    items: result.rows.map((row) => ({ ...row, amountMinor: amount(row.amountMinor) })),
    total: Number(total.rows[0]?.total ?? 0),
  };
}

export async function getAdminOrderDetail(id: string) {
  const db = await getDb();
  const order = await db.query<
    AdminOrderRow & {
      completedAt: Date | null;
      allocationStatus: string | null;
      allocationExpiresAt: Date | null;
      productId: string;
    }
  >(
    `select o.id, o.order_number as "orderNumber", o.status,
            o.amount_minor as "amountMinor", o.created_at as "createdAt",
            o.completed_at as "completedAt", o.failure_reason as "failureReason",
            p.username, p.email, p.id as "userId",
            pr.name as "productName", pr.id as "productId",
            a.id as "allocationId", a.status as "allocationStatus",
            a.expires_at as "allocationExpiresAt"
       from orders o
       join profiles p on p.id = o.user_id
       join products pr on pr.id = o.product_id
       left join proxy_allocations a on a.order_id = o.id
      where o.id = $1 limit 1`,
    [id],
  );
  if (!order.rows[0]) return null;
  const ledger = await db.query<AdminLedgerRow>(
    `select l.id, l.user_id as "userId", l.entry_type as "entryType",
            l.amount_minor as "amountMinor", l.balance_after_minor as "balanceAfterMinor",
            l.currency, l.reference, l.related_order_id as "relatedOrderId",
            l.related_deposit_id as "relatedDepositId", l.description,
            l.created_at as "createdAt", p.username, p.email,
            o.order_number as "orderNumber", c.username as "createdByName"
       from wallet_ledger l
       join profiles p on p.id = l.user_id
       left join orders o on o.id = l.related_order_id
       left join profiles c on c.id = l.created_by
      where l.related_order_id = $1 order by l.created_at asc`,
    [id],
  );
  return {
    order: { ...order.rows[0], amountMinor: amount(order.rows[0].amountMinor) },
    ledger: ledger.rows,
  };
}

export async function getAdminDeposits(input: {
  q?: string;
  status?: string;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: SqlParam[] = [];
  let index = 1;
  if (input.q) {
    clauses.push(
      `(d.provider_reference ilike $${index} or p.username ilike $${index} or p.email ilike $${index})`,
    );
    params.push(`%${input.q}%`);
    index += 1;
  }
  if (input.status && input.status !== "all") {
    clauses.push(`d.status = $${index}`);
    params.push(input.status);
    index += 1;
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const total = await db.query<{ total: number }>(
    `select count(*)::int as total from deposits d
       join profiles p on p.id = d.user_id ${where}`,
    params,
  );
  const result = await db.query<AdminDepositRow>(
    `select d.id, d.user_id as "userId", d.provider,
            d.provider_reference as "providerReference",
            d.amount_minor as "amountMinor", d.currency, d.status,
            d.provider_transaction_id as "providerTransactionId",
            d.gateway_fee_minor as "gatewayFeeMinor",
            d.authorization_url as "authorizationUrl", d.channel,
            d.verified_at as "verifiedAt", d.credited_at as "creditedAt",
            d.created_at as "createdAt", d.updated_at as "updatedAt",
            p.username, p.email
       from deposits d join profiles p on p.id = d.user_id
       ${where}
      order by d.created_at desc
      limit $${index} offset $${index + 1}`,
    [...params, input.pageSize, (input.page - 1) * input.pageSize],
  );
  return {
    items: result.rows.map((row) => ({
      ...row,
      amountMinor: amount(row.amountMinor),
      gatewayFeeMinor: amount(row.gatewayFeeMinor),
    })),
    total: Number(total.rows[0]?.total ?? 0),
  };
}

export async function getAdminLedger(input: {
  q?: string;
  type?: string;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: SqlParam[] = [];
  let index = 1;
  if (input.q) {
    clauses.push(
      `(p.username ilike $${index} or l.reference ilike $${index} or o.order_number ilike $${index})`,
    );
    params.push(`%${input.q}%`);
    index += 1;
  }
  if (input.type && input.type !== "all") {
    clauses.push(`l.entry_type = $${index}`);
    params.push(input.type);
    index += 1;
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const total = await db.query<{ total: number }>(
    `select count(*)::int as total from wallet_ledger l
       join profiles p on p.id = l.user_id
       left join orders o on o.id = l.related_order_id ${where}`,
    params,
  );
  const result = await db.query<AdminLedgerRow>(
    `select l.id, l.user_id as "userId", l.entry_type as "entryType",
            l.amount_minor as "amountMinor", l.balance_after_minor as "balanceAfterMinor",
            l.currency, l.reference, l.related_order_id as "relatedOrderId",
            l.related_deposit_id as "relatedDepositId", l.description,
            l.created_at as "createdAt", p.username, p.email,
            o.order_number as "orderNumber", c.username as "createdByName"
       from wallet_ledger l
       join profiles p on p.id = l.user_id
       left join orders o on o.id = l.related_order_id
       left join profiles c on c.id = l.created_by
       ${where}
      order by l.created_at desc
      limit $${index} offset $${index + 1}`,
    [...params, input.pageSize, (input.page - 1) * input.pageSize],
  );
  return {
    items: result.rows.map((row) => ({
      ...row,
      amountMinor: amount(row.amountMinor),
      balanceAfterMinor: amount(row.balanceAfterMinor),
    })),
    total: Number(total.rows[0]?.total ?? 0),
  };
}

export async function getAdminExpenses() {
  const db = await getDb();
  const result = await db.query<AdminExpenseRow>(
    `select e.id, e.description, e.category,
            e.amount_minor as "amountMinor", e.currency,
            e.expense_date as "expenseDate",
            e.proxy_inventory_id as "proxyInventoryId",
            e.notes, e.created_at as "createdAt",
            i.label as "proxyLabel", p.username as "createdByName"
       from expenses e
       left join proxy_inventory i on i.id = e.proxy_inventory_id
       left join profiles p on p.id = e.created_by
      order by e.expense_date desc, e.created_at desc limit 100`,
  );
  return result.rows.map((row) => ({ ...row, amountMinor: amount(row.amountMinor) }));
}

export async function getAdminTickets() {
  const db = await getDb();
  const result = await db.query<AdminTicketRow & { username: string; email: string }>(
    `select t.id, t.ticket_number as "ticketNumber", t.user_id as "userId",
            t.subject, t.category, t.priority, t.status,
            t.last_message_at as "lastMessageAt", t.closed_at as "closedAt",
            t.created_at as "createdAt", t.updated_at as "updatedAt",
            p.username, p.email,
            (select count(*)::int from support_messages m where m.ticket_id = t.id) as "messageCount"
       from support_tickets t join profiles p on p.id = t.user_id
      order by
        case t.status when 'open' then 0 when 'pending' then 1 when 'resolved' then 2 else 3 end,
        t.last_message_at desc
      limit 100`,
  );
  return result.rows;
}

export async function getAdminTicketDetail(id: string) {
  const db = await getDb();
  const ticket = await db.query<
    AdminTicketRow & { username: string; email: string }
  >(
    `select t.id, t.ticket_number as "ticketNumber", t.user_id as "userId",
            t.subject, t.category, t.priority, t.status,
            t.last_message_at as "lastMessageAt", t.closed_at as "closedAt",
            t.created_at as "createdAt", t.updated_at as "updatedAt",
            p.username, p.email,
            (select count(*)::int from support_messages m where m.ticket_id = t.id) as "messageCount"
       from support_tickets t join profiles p on p.id = t.user_id
      where t.id = $1 limit 1`,
    [id],
  );
  if (!ticket.rows[0]) return null;
  const messages = await db.query<SupportMessage>(
    `select m.id, m.ticket_id as "ticketId",
            m.author_user_id as "authorUserId", m.is_staff as "isStaff",
            m.body, m.created_at as "createdAt",
            p.display_name as "authorName", p.role as "authorRole"
       from support_messages m
       left join profiles p on p.id = m.author_user_id
      where m.ticket_id = $1 order by m.created_at asc`,
    [id],
  );
  return { ticket: ticket.rows[0], messages: messages.rows };
}

export async function getContactMessages() {
  const db = await getDb();
  const result = await db.query<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: string;
    createdAt: Date;
  }>(
    `select id, name, email, subject, message, status,
            created_at as "createdAt"
       from contact_messages order by created_at desc limit 100`,
  );
  return result.rows;
}

export async function getAdminAudit(input: {
  q?: string;
  action?: string;
  page: number;
  pageSize: number;
}) {
  const db = await getDb();
  const clauses: string[] = [];
  const params: SqlParam[] = [];
  let index = 1;
  if (input.q) {
    clauses.push(
      `(a.action ilike $${index} or a.entity_type ilike $${index} or p.username ilike $${index})`,
    );
    params.push(`%${input.q}%`);
    index += 1;
  }
  if (input.action && input.action !== "all") {
    clauses.push(`a.action = $${index}`);
    params.push(input.action);
    index += 1;
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const total = await db.query<{ total: number }>(
    `select count(*)::int as total from audit_logs a
       left join profiles p on p.id = a.actor_user_id ${where}`,
    params,
  );
  const result = await db.query<AdminAuditRow>(
    `select a.id, a.actor_user_id as "actorUserId", a.actor_role as "actorRole",
            a.action, a.entity_type as "entityType", a.entity_id as "entityId",
            a.metadata, a.ip_address as "ipAddress", a.user_agent as "userAgent",
            a.created_at as "createdAt", p.username as "actorUsername"
       from audit_logs a left join profiles p on p.id = a.actor_user_id
       ${where}
      order by a.created_at desc
      limit $${index} offset $${index + 1}`,
    [...params, input.pageSize, (input.page - 1) * input.pageSize],
  );
  return {
    items: result.rows,
    total: Number(total.rows[0]?.total ?? 0),
  };
}

export async function getAdminSettings(): Promise<AppSettings> {
  return getAppSettings();
}

export async function getAdminSearch(q: string) {
  const db = await getDb();
  const term = `%${q.replace(/[%_]/g, "")}%`;
  const [users, orders, tickets] = await Promise.all([
    db.query<{ id: string; username: string; email: string; role: string }>(
      `select id, username, email, role from profiles
        where username ilike $1 or email ilike $1 limit 5`,
      [term],
    ),
    db.query<{
      id: string;
      orderNumber: string;
      status: string;
      amountMinor: number;
      username: string;
    }>(
      `select o.id, o.order_number as "orderNumber", o.status,
              o.amount_minor as "amountMinor", p.username
         from orders o join profiles p on p.id = o.user_id
        where o.order_number ilike $1 or p.username ilike $1
        order by o.created_at desc limit 5`,
      [term],
    ),
    db.query<{ id: string; ticketNumber: string; subject: string; status: string }>(
      `select id, ticket_number as "ticketNumber", subject, status
         from support_tickets
        where subject ilike $1 or ticket_number ilike $1
        order by last_message_at desc limit 5`,
      [term],
    ),
  ]);
  return {
    users: users.rows,
    orders: orders.rows.map((row) => ({ ...row, amountMinor: amount(row.amountMinor) })),
    tickets: tickets.rows,
  };
}

export async function getAdminAnalytics(days: number) {
  const db = await getDb();
  const [summary, monthly, packageMix, expensesByCategory, recentDeposits] =
    await Promise.all([
      db.query<{
        grossPurchaseVolume: number;
        netSales: number;
        refunds: number;
        deposits: number;
        gatewayFees: number;
        directProxyCost: number;
        operatingExpenses: number;
        completedOrders: number;
        refundedOrders: number;
        walletLiability: number;
      }>(
        `select
           (select coalesce(sum(amount_minor),0)::bigint from orders
             where status in ('completed','refunded')
               and created_at >= now() - ($1 || ' days')::interval) as "grossPurchaseVolume",
           (select coalesce(sum(amount_minor),0)::bigint from orders
             where status = 'completed'
               and created_at >= now() - ($1 || ' days')::interval) as "netSales",
           (select coalesce(sum(amount_minor),0)::bigint from wallet_ledger
             where entry_type = 'refund_credit'
               and created_at >= now() - ($1 || ' days')::interval) as "refunds",
           (select coalesce(sum(amount_minor),0)::bigint from deposits
             where status = 'credited'
               and created_at >= now() - ($1 || ' days')::interval) as "deposits",
           (select coalesce(sum(gateway_fee_minor),0)::bigint from deposits
             where status = 'credited'
               and created_at >= now() - ($1 || ' days')::interval) as "gatewayFees",
           (select coalesce(sum(i.purchase_cost_minor),0)::bigint
              from proxy_inventory i
             where exists (
               select 1 from proxy_allocations a
                where a.proxy_inventory_id = i.id
                  and a.activated_at >= now() - ($1 || ' days')::interval
             )) as "directProxyCost",
           (select coalesce(sum(amount_minor),0)::bigint from expenses
             where expense_date >= (now() - ($1 || ' days')::interval)::date) as "operatingExpenses",
           (select count(*)::int from orders where status = 'completed'
             and created_at >= now() - ($1 || ' days')::interval) as "completedOrders",
           (select count(*)::int from orders where status = 'refunded'
             and created_at >= now() - ($1 || ' days')::interval) as "refundedOrders",
           (select coalesce(sum(amount_minor),0)::bigint from wallet_ledger) as "walletLiability"`,
        [days],
      ),
      db.query<{ month: string; sales: number; refunds: number }>(
        `with months as (
           select generate_series(
             date_trunc('month', current_date) - interval '5 months',
             date_trunc('month', current_date),
             interval '1 month'
           ) as month
         )
         select to_char(months.month, 'YYYY-MM') as month,
                coalesce((select sum(o.amount_minor) from orders o
                   where o.status = 'completed'
                     and date_trunc('month', o.created_at) = months.month),0)::bigint as sales,
                coalesce((select sum(l.amount_minor) from wallet_ledger l
                   where l.entry_type = 'refund_credit'
                     and date_trunc('month', l.created_at) = months.month),0)::bigint as refunds
           from months order by months.month`,
      ),
      db.query<{ name: string; count: number; totalMinor: number }>(
        `select p.name, count(o.id)::int as count,
                coalesce(sum(o.amount_minor),0)::bigint as "totalMinor"
           from orders o join products p on p.id = o.product_id
          where o.status = 'completed'
            and o.created_at >= now() - ($1 || ' days')::interval
          group by p.name order by count desc`,
        [days],
      ),
      db.query<{ category: string; totalMinor: number }>(
        `select category, coalesce(sum(amount_minor),0)::bigint as "totalMinor"
           from expenses
          where expense_date >= (now() - ($1 || ' days')::interval)::date
          group by category order by "totalMinor" desc`,
        [days],
      ),
      db.query<{ month: string; totalMinor: number }>(
        `select to_char(date_trunc('month', created_at), 'YYYY-MM') as month,
                coalesce(sum(amount_minor),0)::bigint as "totalMinor"
           from deposits where status = 'credited'
            and created_at >= now() - ($1 || ' days')::interval
          group by 1 order by 1`,
        [days],
      ),
    ]);
  const row = summary.rows[0];
  return {
    days,
    grossPurchaseVolume: amount(row?.grossPurchaseVolume),
    netSales: amount(row?.netSales),
    refunds: amount(row?.refunds),
    deposits: amount(row?.deposits),
    gatewayFees: amount(row?.gatewayFees),
    directProxyCost: amount(row?.directProxyCost),
    operatingExpenses: amount(row?.operatingExpenses),
    completedOrders: Number(row?.completedOrders ?? 0),
    refundedOrders: Number(row?.refundedOrders ?? 0),
    walletLiability: amount(row?.walletLiability),
    monthly: monthly.rows.map((item) => ({
      month: item.month,
      salesMinor: amount(item.sales),
      refundsMinor: amount(item.refunds),
    })),
    packageMix: packageMix.rows.map((item) => ({
      ...item,
      count: Number(item.count),
      totalMinor: amount(item.totalMinor),
    })),
    expensesByCategory: expensesByCategory.rows.map((item) => ({
      ...item,
      totalMinor: amount(item.totalMinor),
    })),
    monthlyDeposits: recentDeposits.rows.map((item) => ({
      month: item.month,
      totalMinor: amount(item.totalMinor),
    })),
  };
}

export async function getAdminBadgeCounts() {
  const db = await getDb();
  const result = await db.query<{ pendingDeposits: number; openTickets: number }>(
    `select
       (select count(*)::int from deposits where status in ('initiated','pending')) as "pendingDeposits",
       (select count(*)::int from support_tickets where status in ('open','pending')) as "openTickets"`,
  );
  return result.rows[0] ?? { pendingDeposits: 0, openTickets: 0 };
}

export async function getAdminUserOptions() {
  const db = await getDb();
  const result = await db.query<{
    id: string;
    username: string;
    email: string;
    status: string;
  }>(
    `select id, username, email, status from profiles
      where role = 'customer' order by username asc limit 300`,
  );
  return result.rows;
}

export async function getRecentAdminAdjustments(limit = 20) {
  const db = await getDb();
  const result = await db.query<AdminLedgerRow>(
    `select l.id, l.user_id as "userId", l.entry_type as "entryType",
            l.amount_minor as "amountMinor", l.balance_after_minor as "balanceAfterMinor",
            l.currency, l.reference, l.related_order_id as "relatedOrderId",
            l.related_deposit_id as "relatedDepositId", l.description,
            l.created_at as "createdAt", p.username, p.email,
            o.order_number as "orderNumber", c.username as "createdByName"
       from wallet_ledger l
       join profiles p on p.id = l.user_id
       left join orders o on o.id = l.related_order_id
       left join profiles c on c.id = l.created_by
      where l.entry_type in ('admin_credit','admin_debit')
      order by l.created_at desc limit $1`,
    [limit],
  );
  return result.rows.map((row) => ({
    ...row,
    amountMinor: amount(row.amountMinor),
    balanceAfterMinor: amount(row.balanceAfterMinor),
  }));
}

export async function getInventoryOptions() {
  const db = await getDb();
  const result = await db.query<{ id: string; label: string }>(
    `select id, label from proxy_inventory
      where archived_at is null order by label asc limit 200`,
  );
  return result.rows;
}

export async function getAdminReferrals() {
  const db = await getDb();
  const rows = await db.query<{
    id: string;
    status: string;
    code: string;
    rewardMinor: number | null;
    createdAt: Date;
    rewardedAt: Date | null;
    referrerUsername: string;
    referrerEmail: string;
    refereeUsername: string;
  }>(
    `select r.id, r.status, r.referral_code as code,
            r.reward_amount_minor::bigint as "rewardMinor",
            r.created_at as "createdAt", r.rewarded_at as "rewardedAt",
            referrer.username as "referrerUsername",
            referrer.email as "referrerEmail",
            referee.username as "refereeUsername"
       from referrals r
       join profiles referrer on referrer.id = r.referrer_id
       join profiles referee on referee.id = r.referee_id
      order by r.created_at desc limit 200`,
  );
  const referrals = rows.rows.map((row) => ({
    ...row,
    rewardMinor: row.rewardMinor === null ? null : Number(row.rewardMinor),
  }));
  return {
    referrals,
    stats: {
      total: referrals.length,
      pending: referrals.filter((row) => row.status === "pending").length,
      rewarded: referrals.filter((row) => row.status === "rewarded").length,
      paidMinor: referrals.reduce((sum, row) => sum + (row.rewardMinor ?? 0), 0),
    },
  };
}
