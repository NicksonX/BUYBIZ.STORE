import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import { AppError } from "@/lib/errors";
import { formatDateTime, formatNaira } from "@/lib/utils";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { recordCustomerActivity } from "@/server/services/activity";
import { notifyAdmin } from "@/server/services/admin-notifications";
import { qualifyReferralForPurchase } from "@/server/services/referrals";
import { qualifyReferralForAmbassador } from "@/server/services/ambassador";
import { evaluateCampaignRewards } from "@/server/services/campaigns";

export type PurchaseOutcome =
  | {
      outcome: "allocated";
      orderId: string;
      orderNumber: string;
      allocationId: string;
      expiresAt: Date;
    }
  | {
      outcome: "refunded";
      orderId: string;
      orderNumber: string;
      reason: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK_LIFETIME";
    };

function newOrderNumber() {
  const now = new Date();
  const date = `${String(now.getUTCFullYear()).slice(2)}${String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `BZ-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function boolSetting(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberSetting(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function loadSettings(tx: SqlTransaction) {
  const result = await tx.query<{ key: string; value: unknown }>(
    `select key, value from app_settings
      where key in ('allocation_safety_buffer_seconds','maintenance_mode','proxy_purchase_paused')`,
  );
  const map = new Map(result.rows.map((row) => [row.key, row.value]));
  return {
    safetyBufferSeconds: Math.max(
      0,
      numberSetting(map.get("allocation_safety_buffer_seconds"), 3600),
    ),
    maintenanceMode: boolSetting(map.get("maintenance_mode"), false),
    proxyPurchasePaused: boolSetting(map.get("proxy_purchase_paused"), false),
  };
}

async function getExistingOutcome(
  tx: SqlTransaction,
  userId: string,
  idempotencyKey: string,
): Promise<PurchaseOutcome | null> {
  const result = await tx.query<{
    id: string;
    orderNumber: string;
    status: string;
    failureReason: string | null;
    allocationId: string | null;
    expiresAt: Date | null;
  }>(
    `select o.id, o.order_number as "orderNumber", o.status,
            o.failure_reason as "failureReason",
            a.id as "allocationId", a.expires_at as "expiresAt"
       from orders o
       left join proxy_allocations a on a.order_id = o.id
      where o.user_id = $1 and o.idempotency_key = $2
      limit 1`,
    [userId, idempotencyKey],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.status === "completed" && row.allocationId && row.expiresAt) {
    return {
      outcome: "allocated",
      orderId: row.id,
      orderNumber: row.orderNumber,
      allocationId: row.allocationId,
      expiresAt: new Date(row.expiresAt),
    };
  }
  if (row.status === "refunded") {
    return {
      outcome: "refunded",
      orderId: row.id,
      orderNumber: row.orderNumber,
      reason:
        row.failureReason === "INSUFFICIENT_STOCK_LIFETIME"
          ? "INSUFFICIENT_STOCK_LIFETIME"
          : "OUT_OF_STOCK",
    };
  }
  throw new AppError(
    "CONFLICT",
    "This purchase is already being processed. Check your orders before trying again.",
  );
}

/**
 * Atomic proxy purchase.
 *
 * Locks the customer's wallet account and candidate inventory rows, then
 * re-checks balance, live seat counts and upstream lifetime inside the
 * transaction. A no-stock attempt creates a refunded order with linked debit
 * and refund ledger entries, so the customer is never left charged.
 */
export async function purchaseProxy(input: {
  userId: string;
  productSlug: string;
  idempotencyKey: string;
  countryCode?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<PurchaseOutcome> {
  const db = await getDb();

  try {
    return await db.transaction(async (tx) => {
      const existing = await getExistingOutcome(
        tx,
        input.userId,
        input.idempotencyKey,
      );
      if (existing) return existing;

      const profileResult = await tx.query<{
        status: string;
        emailVerified: boolean;
        onboardingComplete: boolean;
        username: string;
      }>(
        `select status, email_verified as "emailVerified",
                onboarding_complete as "onboardingComplete", username
           from profiles where id = $1 for update`,
        [input.userId],
      );
      const profile = profileResult.rows[0];
      if (!profile) {
        throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
      }
      if (profile.status === "suspended") {
        throw new AppError(
          "ACCOUNT_SUSPENDED",
          "Your account is suspended. Contact support to restore access.",
        );
      }
      if (profile.status === "frozen") {
        throw new AppError(
          "ACCOUNT_FROZEN",
          "Your account is frozen for inactivity. Reactivate it before purchasing.",
        );
      }
      if (!profile.emailVerified) {
        throw new AppError(
          "EMAIL_NOT_VERIFIED",
          "Verify your email address before making a purchase.",
        );
      }
      if (!profile.onboardingComplete) {
        throw new AppError("FORBIDDEN", "Finish setting up your account first.");
      }

      await recordCustomerActivity(tx, input.userId);

      const settings = await loadSettings(tx);
      if (settings.maintenanceMode) {
        throw new AppError(
          "MAINTENANCE",
          "Purchases are temporarily paused for maintenance. Your wallet has not been charged.",
        );
      }
      if (settings.proxyPurchasePaused) {
        throw new AppError(
          "MAINTENANCE",
          "Proxy purchases are temporarily paused while we perform maintenance. Please check back shortly.",
        );
      }

      const productResult = await tx.query<{
        id: string;
        slug: string;
        name: string;
        durationSeconds: number;
        priceMinor: number;
        accessType: "shared" | "single";
        maxActivePerCustomer: number | null;
      }>(
        `select id, slug, name, duration_seconds as "durationSeconds",
                price_minor as "priceMinor",
                access_type as "accessType",
                max_active_per_customer as "maxActivePerCustomer"
           from products
          where slug = $1
            and is_active = true
            and is_coming_soon = false
            and category = 'proxy'
          limit 1
          for share`,
        [input.productSlug],
      );
      const product = productResult.rows[0];
      if (!product || !product.durationSeconds) {
        throw new AppError("NOT_FOUND", "That proxy plan is not available.");
      }
      const price = Number(product.priceMinor);

      if (product.maxActivePerCustomer) {
        const activeProduct = await tx.query<{ count: number }>(
          `select count(*)::int as count from proxy_allocations
            where user_id = $1 and product_id = $2
              and status = 'active' and expires_at > now()`,
          [input.userId, product.id],
        );
        if ((activeProduct.rows[0]?.count ?? 0) >= product.maxActivePerCustomer) {
          throw new AppError(
            "CONFLICT",
            "You already have an active personal proxy. It must expire before you can buy another one.",
          );
        }
      }

      await tx.query(
        `insert into wallet_accounts (user_id) values ($1)
         on conflict (user_id) do nothing`,
        [input.userId],
      );
      const walletResult = await tx.query<{ id: string }>(
        `select id from wallet_accounts where user_id = $1 for update`,
        [input.userId],
      );
      const wallet = walletResult.rows[0];
      if (!wallet) {
        throw new AppError("UNKNOWN", "Your wallet could not be loaded.");
      }
      const balanceResult = await tx.query<{ balance: number }>(
        `select coalesce(sum(amount_minor), 0)::bigint as balance
           from wallet_ledger where wallet_account_id = $1`,
        [wallet.id],
      );
      const balance = Number(balanceResult.rows[0]?.balance ?? 0);

      if (balance < price) {
        throw new AppError(
          "INSUFFICIENT_BALANCE",
          "Your wallet balance is too low for this plan. Add funds and try again.",
        );
      }

      // Lock candidates oldest-first. SKIP LOCKED prevents two buyers from
      // waiting on the same inventory row; the second buyer moves on or gets
      // an honest out-of-stock result.
      const candidateResult = await tx.query<{
        id: string;
        maxSeats: number;
        upstreamExpiresAt: Date;
      }>(
        `select i.id, i.max_seats as "maxSeats",
                i.upstream_expires_at as "upstreamExpiresAt"
           from proxy_inventory i
          where i.archived_at is null
            and i.status in ('available','full')
            and i.verification_status = 'verified'
            and i.country_code is not null
            and i.access_type = $2
            and i.product_slug = $3
            and ($4::text is null or i.country_code = $4)
            and i.upstream_expires_at >=
                now() + ($1::int * interval '1 second')
            and not exists (
              select 1 from proxy_allocations a
               where a.proxy_inventory_id = i.id
                 and a.user_id = $5
                 and a.status = 'active'
                 and a.expires_at > now()
            )
          order by i.last_assigned_at asc nulls first, i.uploaded_at asc, i.id asc
          limit 25
          for update skip locked`,
        [product.durationSeconds, product.accessType, product.slug, input.countryCode ?? null, input.userId],
      );

      let selectedInventoryId: string | null = null;
      for (const candidate of candidateResult.rows) {
        const seatsResult = await tx.query<{ seats: number }>(
          `select count(*)::int as seats
             from proxy_allocations
            where proxy_inventory_id = $1
              and status = 'active'
              and expires_at > now()`,
          [candidate.id],
        );
        if ((seatsResult.rows[0]?.seats ?? 0) < candidate.maxSeats) {
          selectedInventoryId = candidate.id;
          break;
        }
      }

      if (!selectedInventoryId) {
        // Distinguish a fully exhausted pool from inventory that simply does
        // not have enough remaining upstream life for this package.
        const reasonResult = await tx.query<{ insufficientLife: boolean }>(
          `select exists (
             select 1
               from proxy_inventory i
              where i.archived_at is null
                and i.status in ('available','full')
                and i.verification_status = 'verified'
                and i.country_code is not null
                and i.access_type = $1
                and i.product_slug = $2
                and ($3::text is null or i.country_code = $3)
                and i.upstream_expires_at > now()
                and (
                  select count(*) from proxy_allocations a
                   where a.proxy_inventory_id = i.id
                     and a.status = 'active'
                     and a.expires_at > now()
                ) < i.max_seats
           ) as "insufficientLife"`,
        [product.accessType, product.slug, input.countryCode ?? null],
        );
        const reason = reasonResult.rows[0]?.insufficientLife
          ? "INSUFFICIENT_STOCK_LIFETIME"
          : "OUT_OF_STOCK";

        const orderId = randomUUID();
        const orderNumber = newOrderNumber();
        await tx.query(
          `insert into orders
             (id, order_number, user_id, product_id, amount_minor, currency,
              status, failure_reason, idempotency_key, metadata, created_at, completed_at)
           values ($1,$2,$3,$4,$5,'NGN','refunded',$6,$7,$8::jsonb,now(),now())`,
          [
            orderId,
            orderNumber,
            input.userId,
            product.id,
            price,
            reason,
            input.idempotencyKey,
            JSON.stringify({
              productSlug: input.productSlug,
              productName: product.name,
              autoRefund: true,
            }),
          ],
        );

        await tx.query(
          `insert into wallet_ledger
             (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
              currency, reference, related_order_id, description, created_at)
           values ($1,$2,'purchase_debit',$3,$4,'NGN',$5,$6,$7,now())`,
          [
            wallet.id,
            input.userId,
            -price,
            balance - price,
            `order:${orderId}:debit`,
            orderId,
            `${product.name} purchase`,
          ],
        );
        await tx.query(
          `insert into wallet_ledger
             (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
              currency, reference, related_order_id, description, created_at)
           values ($1,$2,'refund_credit',$3,$4,'NGN',$5,$6,$7,now())`,
          [
            wallet.id,
            input.userId,
            price,
            balance,
            `order:${orderId}:refund`,
            orderId,
            "Refunded to BUYBIZ balance. No proxy was available.",
          ],
        );

        await notifyUser(tx, {
          userId: input.userId,
          type: "refund",
          title: "Purchase refunded to your wallet",
          body: `We could not allocate ${product.name} (${orderNumber}) because no eligible proxy inventory was available. The full amount has been returned to your BUYBIZ wallet.`,
          href: `/dashboard/orders/${orderId}`,
        });
        await notifyAdmin(tx, {
          type: "failed_allocation",
          severity: "warning",
          title: "Proxy allocation failed and was refunded",
          body: `${product.name} could not be allocated for order ${orderNumber}. The full ${formatNaira(price, { exact: true })} was refunded to the customer wallet. Reason: ${reason}.`,
          actionUrl: `/admin/orders/${orderId}`,
          relatedUserId: input.userId,
          dedupeKey: `failed_allocation:${orderId}`,
        });
        await writeAuditLog(tx, {
          actorUserId: input.userId,
          actorRole: "customer",
          action: "order.refunded_auto",
          entityType: "order",
          entityId: orderId,
          metadata: { orderNumber, reason, amountMinor: price },
          ip: input.ip,
          userAgent: input.userAgent,
        });

        return {
          outcome: "refunded",
          orderId,
          orderNumber,
          reason,
        } satisfies PurchaseOutcome;
      }

      const orderId = randomUUID();
      const orderNumber = newOrderNumber();
      await tx.query(
        `insert into orders
           (id, order_number, user_id, product_id, amount_minor, currency, status,
            idempotency_key, metadata, created_at, completed_at)
         values ($1,$2,$3,$4,$5,'NGN','completed',$6,$7::jsonb,now(),now())`,
        [
          orderId,
          orderNumber,
          input.userId,
          product.id,
          price,
          input.idempotencyKey,
          JSON.stringify({
            productSlug: input.productSlug,
            productName: product.name,
            inventoryId: selectedInventoryId,
          }),
        ],
      );

      await tx.query(
        `insert into wallet_ledger
           (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
            currency, reference, related_order_id, description, created_at)
         values ($1,$2,'purchase_debit',$3,$4,'NGN',$5,$6,$7,now())`,
        [
          wallet.id,
          input.userId,
          -price,
          balance - price,
          `order:${orderId}:debit`,
          orderId,
          `${product.name} purchase`,
        ],
      );

      const allocationResult = await tx.query<{
        id: string;
        expiresAt: Date;
      }>(
        `insert into proxy_allocations
           (user_id, proxy_inventory_id, order_id, product_id, status,
            activated_at, expires_at)
         values ($1,$2,$3,$4,'active',now(),now() + ($5::int * interval '1 second'))
         returning id, expires_at as "expiresAt"`,
        [
          input.userId,
          selectedInventoryId,
          orderId,
          product.id,
          product.durationSeconds,
        ],
      );
      const allocation = allocationResult.rows[0];

      await tx.query(
        `update proxy_inventory i
            set last_assigned_at = now(),
                status = case
              when (
                select count(*) from proxy_allocations a
                 where a.proxy_inventory_id = i.id
                   and a.status = 'active'
                   and a.expires_at > now()
              ) >= i.max_seats then 'full'::proxy_status
              else 'available'::proxy_status
            end,
            updated_at = now()
          where i.id = $1 and i.status in ('available','full')`,
        [selectedInventoryId],
      );

      await qualifyReferralForPurchase(tx, {
        refereeId: input.userId,
        orderId,
      });
      await qualifyReferralForAmbassador(tx, {
        refereeId: input.userId,
        eventType: "purchase",
        eventRef: orderId,
        durationSeconds: product.durationSeconds,
      });
      await evaluateCampaignRewards(tx, { customerId: input.userId });
      await notifyUser(tx, {
        userId: input.userId,
        type: "allocation",
        title: "Proxy activated",
        body: `${product.name} is now active until ${formatDateTime(
          allocation.expiresAt,
        )} (WAT). Open My Proxies to view your shared connection details.`,
        href: `/dashboard/proxies/${allocation.id}`,
      });
      await writeAuditLog(tx, {
        actorUserId: input.userId,
        actorRole: "customer",
        action: "order.completed",
        entityType: "order",
        entityId: orderId,
        metadata: {
          orderNumber,
          productSlug: input.productSlug,
          amountMinor: price,
          inventoryId: selectedInventoryId,
        },
        ip: input.ip,
        userAgent: input.userAgent,
      });

      return {
        outcome: "allocated",
        orderId,
        orderNumber,
        allocationId: allocation.id,
        expiresAt: new Date(allocation.expiresAt),
      } satisfies PurchaseOutcome;
    });
  } catch (error) {
    // Concurrent duplicate submission: the unique (user, idempotency) index
    // wins the race. Return the already-created order rather than charging
    // again.
    const code = (error as { code?: string }).code;
    if (code === "23505" || (error as Error).message.includes("orders_user_idempotency_unique")) {
      const db2 = await getDb();
      const existing = await db2.transaction((tx) =>
        getExistingOutcome(tx, input.userId, input.idempotencyKey),
      );
      if (existing) return existing;
    }
    const message = (error as Error).message ?? "";
    if (message.includes("PROXY_AT_CAPACITY")) {
      throw new AppError(
        "PROXY_AT_CAPACITY",
        "The selected proxy just filled up. No charge was made. Please try again.",
      );
    }
    if (message.includes("INSUFFICIENT_UPSTREAM_LIFETIME")) {
      throw new AppError(
        "INSUFFICIENT_UPSTREAM_LIFETIME",
        "There is not enough remaining upstream lifetime for this package. No charge was made.",
      );
    }
    throw error;
  }
}
