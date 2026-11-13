import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";
import { getAppSettings } from "@/server/data/settings";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { recordCustomerActivity } from "@/server/services/activity";

function renewalOrderNumber() {
  const now = new Date();
  const date = `${String(now.getUTCFullYear()).slice(2)}${String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `BZ-R-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function renewProxy(input: {
  userId: string;
  allocationId: string;
  idempotencyKey: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const db = await getDb();
  const settings = await getAppSettings();

  return db.transaction(async (tx) => {
    const existing = await tx.query<{
      id: string;
      orderId: string;
      newExpiresAt: Date;
      amountMinor: number;
    }>(
      `select r.id, r.order_id as "orderId",
              r.new_expires_at as "newExpiresAt",
              r.amount_minor::bigint as "amountMinor"
         from proxy_renewals r
         join orders o on o.id = r.order_id
        where o.user_id = $1 and o.idempotency_key = $2
        limit 1`,
      [input.userId, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      return {
        outcome: "renewed" as const,
        renewalId: existing.rows[0].id,
        orderId: existing.rows[0].orderId,
        newExpiresAt: new Date(existing.rows[0].newExpiresAt),
        amountMinor: Number(existing.rows[0].amountMinor),
        alreadyProcessed: true,
      };
    }

    const allocationResult = await tx.query<{
      id: string;
      status: string;
      expiresAt: Date;
      inventoryId: string;
      productId: string;
      productName: string;
      durationSeconds: number | null;
      priceMinor: number;
      upstreamExpiresAt: Date;
      archivedAt: Date | null;
    }>(
      `select a.id, a.status, a.expires_at as "expiresAt",
              a.proxy_inventory_id as "inventoryId",
              a.product_id as "productId", p.name as "productName",
              p.duration_seconds as "durationSeconds",
              p.price_minor as "priceMinor",
              i.upstream_expires_at as "upstreamExpiresAt",
              i.archived_at as "archivedAt"
         from proxy_allocations a
         join products p on p.id = a.product_id
         join proxy_inventory i on i.id = a.proxy_inventory_id
        where a.id = $1 and a.user_id = $2
        limit 1
        for update of a, i`,
      [input.allocationId, input.userId],
    );
    const allocation = allocationResult.rows[0];
    if (!allocation) {
      throw new AppError("NOT_FOUND", "That proxy allocation could not be found.");
    }
    if (allocation.status !== "active") {
      throw new AppError(
        "CONFLICT",
        "Only an active proxy can be renewed. Buy a new plan instead.",
      );
    }
    const previousExpiry = new Date(allocation.expiresAt);
    if (previousExpiry.getTime() <= Date.now()) {
      throw new AppError(
        "CONFLICT",
        "This access window has already ended. Buy a new plan instead.",
      );
    }
    if (allocation.archivedAt || !allocation.durationSeconds) {
      throw new AppError("CONFLICT", "This proxy can no longer be renewed.");
    }

    await recordCustomerActivity(tx, input.userId);

    const newExpiry = new Date(
      previousExpiry.getTime() + Number(allocation.durationSeconds) * 1000,
    );
    const upstreamExpiry = new Date(allocation.upstreamExpiresAt);
    if (
      upstreamExpiry.getTime() <
      newExpiry.getTime() + settings.allocationSafetyBufferSeconds * 1000
    ) {
      throw new AppError(
        "CONFLICT",
        "The upstream does not have enough remaining lifetime for another full access window. Buy a new plan or open a support ticket.",
      );
    }

    const price = Number(allocation.priceMinor);
    await tx.query(
      `insert into wallet_accounts (user_id) values ($1)
       on conflict (user_id) do nothing`,
      [input.userId],
    );
    const wallet = await tx.query<{ id: string }>(
      `select id from wallet_accounts where user_id = $1 for update`,
      [input.userId],
    );
    if (!wallet.rows[0]) throw new AppError("UNKNOWN", "Wallet could not be loaded.");
    const balanceResult = await tx.query<{ balance: unknown }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance
         from wallet_ledger where wallet_account_id = $1`,
      [wallet.rows[0].id],
    );
    const balance = Number(balanceResult.rows[0]?.balance ?? 0);
    if (balance < price) {
      throw new AppError(
        "INSUFFICIENT_BALANCE",
        "Your wallet does not have enough credit to renew this proxy. Add funds first.",
      );
    }

    const orderId = randomUUID();
    const orderNumber = renewalOrderNumber();
    const renewalId = randomUUID();
    await tx.query(
      `insert into orders
         (id, order_number, user_id, product_id, amount_minor, currency, status,
          idempotency_key, metadata, created_at, completed_at)
       values ($1,$2,$3,$4,$5,'NGN','completed',$6,$7::jsonb,now(),now())`,
      [
        orderId,
        orderNumber,
        input.userId,
        allocation.productId,
        price,
        input.idempotencyKey,
        JSON.stringify({
          renewal: true,
          allocationId: allocation.id,
          previousExpiresAt: previousExpiry.toISOString(),
          newExpiresAt: newExpiry.toISOString(),
          productName: allocation.productName,
        }),
      ],
    );
    await tx.query(
      `insert into wallet_ledger
         (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
          currency, reference, related_order_id, description, created_at)
       values ($1,$2,'purchase_debit',$3,$4,'NGN',$5,$6,$7,now())`,
      [
        wallet.rows[0].id,
        input.userId,
        -price,
        balance - price,
        `renewal:${orderId}:debit`,
        orderId,
        `${allocation.productName} renewal`,
      ],
    );
    await tx.query(
      `update proxy_allocations
          set expires_at = $2, status = 'active'
        where id = $1`,
      [allocation.id, newExpiry],
    );
    await tx.query(
      `insert into proxy_renewals
         (id, allocation_id, user_id, order_id, product_id,
          previous_expires_at, new_expires_at, amount_minor)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        renewalId,
        allocation.id,
        input.userId,
        orderId,
        allocation.productId,
        previousExpiry,
        newExpiry,
        price,
      ],
    );
    await notifyUser(tx, {
      userId: input.userId,
      type: "allocation",
      title: "Proxy renewed",
      body: `${allocation.productName} now expires ${formatDateTime(newExpiry)}. ${price / 100} NGN was debited from your wallet.`,
      href: `/dashboard/proxies/${allocation.id}`,
    });
    await writeAuditLog(tx, {
      actorUserId: input.userId,
      actorRole: "customer",
      action: "allocation.renewed",
      entityType: "proxy_allocation",
      entityId: allocation.id,
      metadata: {
        orderId,
        renewalId,
        previousExpiresAt: previousExpiry.toISOString(),
        newExpiresAt: newExpiry.toISOString(),
        amountMinor: price,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });

    return {
      outcome: "renewed" as const,
      renewalId,
      orderId,
      newExpiresAt: newExpiry,
      amountMinor: price,
      alreadyProcessed: false,
    };
  });
}
