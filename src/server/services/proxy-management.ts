import "server-only";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import { AppError } from "@/lib/errors";
import { formatNaira } from "@/lib/utils";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { notifyAdmin } from "@/server/services/admin-notifications";

const DAY_MS = 86_400_000;

export type TerminationQuote = {
  allocationId: string;
  productName: string;
  amountPaidMinor: number;
  durationSeconds: number;
  activatedAt: Date;
  expiresAt: Date;
  totalDays: number;
  daysUsed: number;
  usedMinor: number;
  refundMinor: number;
  eligible: boolean;
  status: string;
};

export type SwitchOption = {
  id: string;
  label: string;
  protocol: string;
  region: string | null;
  accessType: "shared" | "single";
  availability: "available";
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Refunds use completed 24-hour periods from the real activation timestamp.
 * The used amount is rounded up, so a refund can never exceed what remains of
 * the original purchase price. No client-supplied amount is accepted.
 */
export function calculateTerminationQuote(input: {
  amountPaidMinor: number;
  durationSeconds: number;
  activatedAt: Date | string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const activatedAt = asDate(input.activatedAt);
  const totalDays = input.durationSeconds / 86400;
  const elapsedMs = Math.max(0, now.getTime() - activatedAt.getTime());
  const completedDays = Math.min(
    Math.floor(totalDays),
    Math.floor(elapsedMs / DAY_MS),
  );
  const usedMinor =
    totalDays > 0
      ? Math.min(
          input.amountPaidMinor,
          Math.ceil((input.amountPaidMinor * completedDays) / totalDays),
        )
      : input.amountPaidMinor;
  const refundMinor = Math.max(0, input.amountPaidMinor - usedMinor);

  return {
    totalDays,
    daysUsed: completedDays,
    usedMinor,
    refundMinor,
  };
}

type AllocationFinancials = {
  id: string;
  userId: string;
  orderId: string;
  productId: string;
  inventoryId: string;
  status: string;
  activatedAt: Date;
  expiresAt: Date;
  productName: string;
  durationSeconds: number;
  credentialGroup: string;
  amountPaidMinor: number;
};

async function loadAllocationFinancials(
  tx: SqlTransaction,
  userId: string,
  allocationId: string,
  forUpdate = false,
) {
  const result = await tx.query<AllocationFinancials>(
    `select a.id, a.user_id as "userId", a.order_id as "orderId",
            a.product_id as "productId", a.proxy_inventory_id as "inventoryId",
            a.status, a.activated_at as "activatedAt", a.expires_at as "expiresAt",
            p.name as "productName", p.duration_seconds as "durationSeconds",
            a.credential_group as "credentialGroup", o.amount_minor as "amountPaidMinor"
       from proxy_allocations a
       join products p on p.id = a.product_id
       join orders o on o.id = a.order_id
      where a.id = $1 and a.user_id = $2
      limit 1
      ${forUpdate ? "for update of a" : ""}`,
    [allocationId, userId],
  );
  return result.rows[0] ?? null;
}

export async function getTerminationQuote(
  userId: string,
  allocationId: string,
): Promise<TerminationQuote> {
  const db = await getDb();
  const allocation = await loadAllocationFinancials(db, userId, allocationId);
  if (!allocation) throw new AppError("NOT_FOUND", "That proxy could not be found.");

  const now = new Date();
  const quote = calculateTerminationQuote({
    amountPaidMinor: Number(allocation.amountPaidMinor),
    durationSeconds: Number(allocation.durationSeconds),
    activatedAt: allocation.activatedAt,
    now,
  });
  const active =
    allocation.status === "active" && asDate(allocation.expiresAt).getTime() > now.getTime();

  return {
    allocationId: allocation.id,
    productName: allocation.productName,
    amountPaidMinor: Number(allocation.amountPaidMinor),
    durationSeconds: Number(allocation.durationSeconds),
    activatedAt: asDate(allocation.activatedAt),
    expiresAt: asDate(allocation.expiresAt),
    totalDays: quote.totalDays,
    daysUsed: quote.daysUsed,
    usedMinor: quote.usedMinor,
    refundMinor: active ? quote.refundMinor : 0,
    eligible: active,
    status: allocation.status,
  };
}

export async function terminateProxy(input: {
  userId: string;
  allocationId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const allocation = await loadAllocationFinancials(
      tx,
      input.userId,
      input.allocationId,
      true,
    );
    if (!allocation) throw new AppError("NOT_FOUND", "That proxy could not be found.");
    if (allocation.status === "terminated") {
      throw new AppError("CONFLICT", "This proxy has already been terminated.");
    }
    const now = new Date();
    if (
      allocation.status !== "active" ||
      asDate(allocation.expiresAt).getTime() <= now.getTime()
    ) {
      throw new AppError(
        "CONFLICT",
        "Only an active, unexpired proxy can be terminated.",
      );
    }

    const existing = await tx.query(
      `select 1 from proxy_terminations where allocation_id = $1 limit 1`,
      [allocation.id],
    );
    if (existing.rows.length > 0) {
      throw new AppError("CONFLICT", "This proxy has already been terminated.");
    }

    const quote = calculateTerminationQuote({
      amountPaidMinor: Number(allocation.amountPaidMinor),
      durationSeconds: Number(allocation.durationSeconds),
      activatedAt: allocation.activatedAt,
      now,
    });

    await tx.query(
      `insert into proxy_terminations
         (allocation_id, user_id, order_id, product_id, proxy_inventory_id,
          amount_paid_minor, duration_seconds, days_used, used_minor, refund_minor,
          reason, terminated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'customer_terminated',$11)`,
      [
        allocation.id,
        input.userId,
        allocation.orderId,
        allocation.productId,
        allocation.inventoryId,
        allocation.amountPaidMinor,
        allocation.durationSeconds,
        quote.daysUsed,
        quote.usedMinor,
        quote.refundMinor,
        now,
      ],
    );

    const updated = await tx.query(
      `update proxy_allocations
          set status = 'terminated'::public.allocation_status,
              ended_at = $2,
              interruption_reason = 'CUSTOMER_TERMINATED'
        where id = $1 and status = 'active'
        returning id`,
      [allocation.id, now],
    );
    if (!updated.rows[0]) {
      throw new AppError("CONFLICT", "This proxy is no longer active.");
    }

    if (quote.refundMinor > 0) {
      await tx.query(
        `insert into wallet_accounts (user_id) values ($1)
         on conflict (user_id) do nothing`,
        [input.userId],
      );
      const wallet = await tx.query<{ id: string }>(
        `select id from wallet_accounts where user_id = $1 for update`,
        [input.userId],
      );
      if (!wallet.rows[0]) throw new AppError("UNKNOWN", "Your wallet could not be loaded.");
      const balanceResult = await tx.query<{ balance: number }>(
        `select coalesce(sum(amount_minor),0)::bigint as balance
           from wallet_ledger where wallet_account_id = $1`,
        [wallet.rows[0].id],
      );
      const balance = Number(balanceResult.rows[0]?.balance ?? 0);
      await tx.query(
        `insert into wallet_ledger
           (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
            currency, reference, related_order_id, description, created_by)
         values ($1,$2,'refund_credit',$3,$4,'NGN',$5,$6,$7,$2)`,
        [
          wallet.rows[0].id,
          input.userId,
          quote.refundMinor,
          balance + quote.refundMinor,
          `termination:${allocation.id}`,
          allocation.orderId,
          `Proxy termination refund: ${allocation.productName} (${quote.daysUsed} completed day${quote.daysUsed === 1 ? "" : "s"})`,
        ],
      );
    }

    await tx.query(`select public.reconcile_proxy_status()`);

    await notifyUser(tx, {
      userId: input.userId,
      type: "refund",
      title: "Proxy terminated",
      body:
        quote.refundMinor > 0
          ? `Your proxy was terminated. ${formatNaira(quote.refundMinor, { exact: true })} was credited to your wallet.`
          : "Your proxy was terminated. No refund was due after the completed usage period.",
      href: "/dashboard/proxies",
    });
    if (quote.refundMinor > 0) {
      await notifyAdmin(tx, {
        type: "wallet_refund",
        severity: "info",
        title: "Customer wallet refund issued",
        body: `${formatNaira(quote.refundMinor, { exact: true })} was refunded to a customer wallet after terminating ${allocation.productName}.`,
        actionUrl: `/admin/users/${input.userId}`,
        relatedUserId: input.userId,
        dedupeKey: `termination_refund:${allocation.id}`,
      });
    }
    await writeAuditLog(tx, {
      actorUserId: input.userId,
      actorRole: "customer",
      action: "proxy.terminated",
      entityType: "proxy_allocation",
      entityId: allocation.id,
      metadata: {
        refundMinor: quote.refundMinor,
        usedMinor: quote.usedMinor,
        daysUsed: quote.daysUsed,
        allocationId: allocation.id,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return { ...quote, allocationId: allocation.id };
  });
}

export async function getSwitchOptions(
  userId: string,
  allocationId: string,
): Promise<SwitchOption[]> {
  const db = await getDb();
  const allocation = await loadAllocationFinancials(db, userId, allocationId);
  if (!allocation) throw new AppError("NOT_FOUND", "That proxy could not be found.");
  if (
    allocation.status !== "active" ||
    asDate(allocation.expiresAt).getTime() <= Date.now()
  ) {
    return [];
  }

  const result = await db.query<SwitchOption>(
    `select i.id, i.label, i.protocol, i.region, i.access_type as "accessType"
       from proxy_inventory i
      where i.id <> $1
        and i.archived_at is null
        and i.status in ('available','full')
        and i.access_type = (
          select p.access_type from products p where p.id = $2
        )
        and i.product_slug in (
          select p.slug from products p where p.duration_seconds = (
            select p2.duration_seconds from products p2 where p2.id = $2
          )
        )
        and i.upstream_expires_at > $3
        and i.credential_group = $4
        and (
          select count(*) from proxy_allocations a
           where a.proxy_inventory_id = i.id
             and a.status = 'active'
             and a.expires_at > now()
        ) < i.max_seats
      order by i.label asc
      limit 30`,
    [allocation.inventoryId, allocation.productId, allocation.expiresAt, allocation.credentialGroup],
  );
  return result.rows.map((row) => ({ ...row, availability: "available" as const }));
}

export async function switchProxy(input: {
  userId: string;
  allocationId: string;
  inventoryId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const allocation = await loadAllocationFinancials(
      tx,
      input.userId,
      input.allocationId,
      true,
    );
    if (!allocation) throw new AppError("NOT_FOUND", "That proxy could not be found.");
    const now = new Date();
    if (
      allocation.status !== "active" ||
      asDate(allocation.expiresAt).getTime() <= now.getTime()
    ) {
      throw new AppError("CONFLICT", "Only an active, unexpired proxy can be switched.");
    }
    if (allocation.inventoryId === input.inventoryId) {
      throw new AppError("CONFLICT", "That proxy is already assigned to you.");
    }

    const target = await tx.query<{
      id: string;
      label: string;
      accessType: "shared" | "single";
      maxSeats: number;
      upstreamExpiresAt: Date;
    }>(
      `select i.id, i.label, i.access_type as "accessType",
              i.max_seats as "maxSeats", i.upstream_expires_at as "upstreamExpiresAt"
         from proxy_inventory i
        where i.id = $1
          and i.archived_at is null
          and i.status in ('available','full')
          and i.access_type = (select p.access_type from products p where p.id = $2)
          and i.credential_group = $3
          and i.product_slug in (
            select p.slug from products p
             where p.duration_seconds = (select p2.duration_seconds from products p2 where p2.id = $2)
          )
        for update`,
      [input.inventoryId, allocation.productId, allocation.credentialGroup],
    );
    const candidate = target.rows[0];
    if (!candidate) {
      throw new AppError("OUT_OF_STOCK", "That proxy is no longer available.");
    }
    if (
      asDate(candidate.upstreamExpiresAt).getTime() <=
      asDate(allocation.expiresAt).getTime()
    ) {
      throw new AppError(
        "INSUFFICIENT_UPSTREAM_LIFETIME",
        "That proxy does not have enough upstream lifetime for your remaining access.",
      );
    }
    const seats = await tx.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations
        where proxy_inventory_id = $1
          and status = 'active'
          and expires_at > now()`,
      [candidate.id],
    );
    if (Number(seats.rows[0]?.count ?? 0) >= candidate.maxSeats) {
      throw new AppError(
        "PROXY_AT_CAPACITY",
        "That proxy just filled up. Choose another available proxy.",
      );
    }

    // The allocation trigger repeats the capacity and upstream checks while
    // the inventory row is locked. The update never changes activation or
    // expiry timestamps, so switching cannot reset the subscription.
    await tx.query(
      `update proxy_allocations
          set proxy_inventory_id = $2
        where id = $1 and status = 'active'`,
      [allocation.id, candidate.id],
    );
    await tx.query(
      `insert into proxy_switches
         (allocation_id, user_id, from_inventory_id, to_inventory_id, switched_at)
       values ($1,$2,$3,$4,$5)`,
      [allocation.id, input.userId, allocation.inventoryId, candidate.id, now],
    );
    await tx.query(`select public.reconcile_proxy_status()`);

    await notifyUser(tx, {
      userId: input.userId,
      type: "allocation",
      title: "Proxy switched",
      body: `Your proxy was switched to ${candidate.label}. Your subscription expiry did not change.`,
      href: `/dashboard/proxies/${allocation.id}`,
    });
    await writeAuditLog(tx, {
      actorUserId: input.userId,
      actorRole: "customer",
      action: "proxy.switched",
      entityType: "proxy_allocation",
      entityId: allocation.id,
      metadata: {
        fromInventoryId: allocation.inventoryId,
        toInventoryId: candidate.id,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      allocationId: allocation.id,
      label: candidate.label,
      expiresAt: allocation.expiresAt,
    };
  });
}
