import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import type { Deposit, DepositStatus, Profile } from "@/lib/db/types";
import { AppError } from "@/lib/errors";
import {
  getAppUrl,
  isDemoMode,
  isPaystackConfigured,
} from "@/lib/config";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  type PaystackTransaction,
} from "@/lib/paystack/client";
import {
  parsePaystackWebhook,
  verifyPaystackSignature,
  webhookEventReference,
  type PaystackWebhookEvent,
} from "@/lib/paystack/webhook";
import { rateLimit } from "@/lib/security/rate-limit";
import { getAppSettings } from "@/server/data/settings";
import { writeAuditLog } from "@/server/services/audit";
import { recordReferralDeposit } from "@/server/services/referrals";
import { notifyUser } from "@/server/services/notifications";
import { recordCustomerActivity } from "@/server/services/activity";
import { qualifyReferralForAmbassador } from "@/server/services/ambassador";
import { evaluateCampaignRewards } from "@/server/services/campaigns";
import { queueEmail, flushEmailQueue } from "@/server/services/email";

export type DepositVerificationResult = {
  status: DepositStatus;
  deposit: Deposit | null;
  alreadyCredited?: boolean;
  message: string;
};

type VerificationPayload = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  id?: string | number;
  fees?: number | null;
  channel?: string | null;
  domain?: string;
};

function newProviderReference() {
  // Paystack accepts alphanumerics and - . = only.
  return `BZ-${randomUUID()}`;
}

function resolveClientReference(value?: string) {
  const candidate = value?.trim();
  if (!candidate) return newProviderReference();
  if (
    !/^BZ-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      candidate,
    )
  ) {
    throw new AppError("VALIDATION", "The payment reference was invalid. Please try again.");
  }
  return candidate;
}

function normalizePayload(tx: PaystackTransaction): VerificationPayload {
  return {
    status: tx.status,
    reference: tx.reference,
    amount: tx.amount,
    currency: (tx.currency || "NGN").toUpperCase(),
    id: tx.id,
    fees: tx.fees ?? 0,
    channel: tx.channel ?? null,
    domain: tx.domain,
  };
}

async function loadDepositForUpdate(tx: SqlTransaction, depositId: string) {
  const result = await tx.query<Deposit & { metadata: Record<string, unknown> }>(
    `select id, user_id as "userId", provider,
            provider_reference as "providerReference",
            amount_minor as "amountMinor", currency, status,
            provider_transaction_id as "providerTransactionId",
            gateway_fee_minor as "gatewayFeeMinor",
            authorization_url as "authorizationUrl", channel,
            metadata, verified_at as "verifiedAt", credited_at as "creditedAt",
            created_at as "createdAt", updated_at as "updatedAt"
       from deposits where id = $1 limit 1 for update`,
    [depositId],
  );
  return result.rows[0] ?? null;
}

async function creditVerifiedDeposit(
  tx: SqlTransaction,
  deposit: Deposit,
  payload: VerificationPayload,
  options?: { actorUserId?: string | null; ip?: string | null; userAgent?: string | null },
) {
  if (payload.status !== "success") {
    throw new AppError(
      "PAYMENT_FAILED",
      "Paystack has not confirmed this payment as successful.",
    );
  }
  if (payload.reference !== deposit.providerReference) {
    throw new AppError(
      "PAYMENT_FAILED",
      "The payment reference does not match the pending deposit.",
    );
  }
  if (Number(payload.amount) !== Number(deposit.amountMinor)) {
    throw new AppError(
      "PAYMENT_FAILED",
      "The paid amount does not match the deposit amount. Your wallet was not credited.",
    );
  }
  if (payload.currency !== "NGN") {
    throw new AppError(
      "PAYMENT_FAILED",
      "The payment currency does not match this wallet (NGN).",
    );
  }

  const expectedMode = process.env.PAYSTACK_MODE === "live" ? "live" : "test";
  if (
    deposit.provider === "paystack" &&
    payload.domain &&
    payload.domain !== expectedMode
  ) {
    throw new AppError(
      "PAYMENT_FAILED",
      "The Paystack environment does not match this deployment. Your wallet was not credited.",
    );
  }

  await tx.query(
    `update deposits
        set status = 'credited',
            provider_transaction_id = $2,
            gateway_fee_minor = $3,
            channel = $4,
            verified_at = now(),
            credited_at = now(),
            updated_at = now()
      where id = $1 and status <> 'credited'`,
    [
      deposit.id,
      payload.id ? String(payload.id) : null,
      Math.max(0, Number(payload.fees ?? 0)),
      payload.channel ?? null,
    ],
  );

  await tx.query(
    `insert into wallet_accounts (user_id) values ($1)
     on conflict (user_id) do nothing`,
    [deposit.userId],
  );
  const wallet = await tx.query<{ id: string }>(
    `select id from wallet_accounts where user_id = $1 for update`,
    [deposit.userId],
  );
  if (!wallet.rows[0]) {
    throw new AppError("UNKNOWN", "Your wallet could not be loaded.");
  }
  const balanceResult = await tx.query<{ balance: number }>(
    `select coalesce(sum(amount_minor),0)::bigint as balance
       from wallet_ledger where wallet_account_id = $1`,
    [wallet.rows[0].id],
  );
  const balance = Number(balanceResult.rows[0]?.balance ?? 0);
  const nextBalance = balance + Number(deposit.amountMinor);

  await tx.query(
    `insert into wallet_ledger
       (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
        currency, reference, related_deposit_id, description)
     values ($1,$2,'deposit_credit',$3,$4,'NGN',$5,$6,$7)`,
    [
      wallet.rows[0].id,
      deposit.userId,
      deposit.amountMinor,
      nextBalance,
      `deposit:${deposit.id}`,
      deposit.id,
      deposit.provider === "demo"
        ? "Demo wallet top-up (simulated)"
        : "Wallet deposit via Paystack",
    ],
  );

  await recordReferralDeposit(tx, {
    id: deposit.id,
    userId: deposit.userId,
    amountMinor: Number(deposit.amountMinor),
    provider: deposit.provider,
    status: "credited",
  });
  await qualifyReferralForAmbassador(tx, {
    refereeId: deposit.userId,
    eventType: "deposit",
    eventRef: deposit.id,
  });
  await evaluateCampaignRewards(tx, { customerId: deposit.userId });

  const depositor = await tx.query<{
    email: string;
    name: string;
  }>(
    `select email, coalesce(display_name, username) as name
       from profiles where id=$1 limit 1`,
    [deposit.userId],
  );
  if (depositor.rows[0]) {
    const money = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    });
    await queueEmail(tx, {
      type: "deposit_confirmation",
      userId: deposit.userId,
      recipient: depositor.rows[0].email,
      data: {
        name: depositor.rows[0].name,
        amountLabel: money.format(Number(deposit.amountMinor) / 100),
        balanceLabel: money.format(nextBalance / 100),
        reference: deposit.providerReference,
        depositDate: new Intl.DateTimeFormat("en-NG", {
          day: "numeric", month: "long", year: "numeric",
          hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos",
        }).format(new Date()),
      },
      dedupeKey: `deposit_confirmation:${deposit.id}`,
    });
  }

  await notifyUser(tx, {
    userId: deposit.userId,
    type: "deposit",
    title: deposit.provider === "demo" ? "Demo wallet top-up credited" : "Payment Received!",
    body:
      deposit.provider === "demo"
        ? "Your simulated demo deposit was credited. No real money was involved."
        : `Your deposit of ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(deposit.amountMinor) / 100)} has been successfully received and credited to your BUYBIZ wallet. Reference: ${deposit.providerReference}. New balance: ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(nextBalance / 100)}.`,
    href: "/dashboard/wallet",
  });

  await writeAuditLog(tx, {
    actorUserId: options?.actorUserId ?? deposit.userId,
    actorRole: "customer",
    action: "deposit.credited",
    entityType: "deposit",
    entityId: deposit.id,
    metadata: {
      provider: deposit.provider,
      amountMinor: deposit.amountMinor,
      reference: deposit.providerReference,
    },
    ip: options?.ip,
    userAgent: options?.userAgent,
  });

  return nextBalance;
}

export async function createDeposit(input: {
  user: Profile;
  amountMinor: number;
  clientReference?: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ depositId: string; authorizationUrl: string; provider: string }> {
  const settings = await getAppSettings();
  if (settings.maintenanceMode) {
    throw new AppError(
      "MAINTENANCE",
      "Wallet deposits are temporarily paused for maintenance.",
    );
  }
  if (!input.user.emailVerified) {
    throw new AppError(
      "EMAIL_NOT_VERIFIED",
      "Verify your email address before adding funds.",
    );
  }
  if (input.user.status === "frozen") {
    throw new AppError(
      "ACCOUNT_FROZEN",
      "This account is frozen. Reactivate it before adding funds.",
    );
  }
  if (input.user.status !== "active") {
    throw new AppError(
      "ACCOUNT_SUSPENDED",
      "This account cannot make deposits right now.",
    );
  }
  if (
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor < settings.depositMinMinor ||
    input.amountMinor > settings.depositMaxMinor
  ) {
    throw new AppError(
      "VALIDATION",
      `Enter an amount between ₦${(
        settings.depositMinMinor / 100
      ).toLocaleString("en-NG")} and ₦${(
        settings.depositMaxMinor / 100
      ).toLocaleString("en-NG")}.`,
    );
  }

  const demo = isDemoMode();
  if (!demo && !isPaystackConfigured()) {
    throw new AppError(
      "CONFIGURATION",
      "Card deposits are not configured for this deployment. Please contact support.",
    );
  }

  const db = await getDb();
  await recordCustomerActivity(db, input.user.id);
  const depositId = randomUUID();
  const reference = resolveClientReference(input.clientReference);
  const provider = demo ? "demo" : "paystack";
  const demoUrl = `/dashboard/wallet/demo/${depositId}`;
  const callbackUrl = `${getAppUrl()}/dashboard/wallet/callback`;

  const existingResult = await getDepositByReference(reference);
  if (existingResult) {
    if (existingResult.userId !== input.user.id) {
      throw new AppError("CONFLICT", "That payment reference is not available.");
    }
    if (existingResult.status === "credited") {
      return {
        depositId: existingResult.id,
        authorizationUrl: `${getAppUrl()}/dashboard/wallet/payment/success?reference=${encodeURIComponent(reference)}`,
        provider: existingResult.provider,
      };
    }
    if (
      existingResult.status === "pending" ||
      existingResult.status === "initiated" ||
      existingResult.status === "successful"
    ) {
      return {
        depositId: existingResult.id,
        authorizationUrl:
          existingResult.authorizationUrl ??
          `${getAppUrl()}/dashboard/wallet/payment/pending?reference=${encodeURIComponent(reference)}`,
        provider: existingResult.provider,
      };
    }
    throw new AppError(
      "CONFLICT",
      "That payment attempt is closed. Close this window and choose Add money again to start a fresh attempt.",
    );
  }

  const inserted = await db.query<{ id: string }>(
    `insert into deposits
       (id, user_id, provider, provider_reference, amount_minor, currency, status,
        metadata, authorization_url, created_at, updated_at)
     values ($1,$2,$3,$4,$5,'NGN','initiated',$6::jsonb,$7,now(),now())
     on conflict (provider_reference) do nothing
     returning id`,
    [
      depositId,
      input.user.id,
      provider,
      reference,
      input.amountMinor,
      JSON.stringify({ demo, initiatedBy: input.user.id, clientReference: Boolean(input.clientReference) }),
      demo ? demoUrl : null,
    ],
  );

  if (!inserted.rows[0]) {
    // A simultaneous request won the insert. Return its checkout or the
    // pending page instead of creating a second payment attempt.
    const concurrent = await getDepositByReference(reference);
    if (!concurrent || concurrent.userId !== input.user.id) {
      throw new AppError("CONFLICT", "That payment reference is not available.");
    }
    return {
      depositId: concurrent.id,
      authorizationUrl:
        concurrent.authorizationUrl ??
        `${getAppUrl()}/dashboard/wallet/payment/pending?reference=${encodeURIComponent(reference)}`,
      provider: concurrent.provider,
    };
  }

  if (demo) {
    await db.query(
      `update deposits set status = 'pending' where id = $1`,
      [depositId],
    );
    await writeAuditLog(db, {
      actorUserId: input.user.id,
      actorRole: input.user.role,
      action: "deposit.demo_initiated",
      entityType: "deposit",
      entityId: depositId,
      metadata: { amountMinor: input.amountMinor, demo: true },
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return { depositId, authorizationUrl: demoUrl, provider };
  }

  try {
    const initialized = await initializePaystackTransaction({
      email: input.user.email,
      amountMinor: input.amountMinor,
      reference,
      callbackUrl,
      metadata: {
        buybiz_deposit_id: depositId,
        buybiz_user_id: input.user.id,
      },
    });
    await db.query(
      `update deposits
          set status = 'pending', authorization_url = $2, updated_at = now()
        where id = $1`,
      [depositId, initialized.authorization_url],
    );
    await writeAuditLog(db, {
      actorUserId: input.user.id,
      actorRole: input.user.role,
      action: "deposit.initiated",
      entityType: "deposit",
      entityId: depositId,
      metadata: { amountMinor: input.amountMinor, provider: "paystack" },
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return {
      depositId,
      authorizationUrl: initialized.authorization_url,
      provider,
    };
  } catch (error) {
    await db.query(
      `update deposits set status = 'failed', updated_at = now() where id = $1`,
      [depositId],
    );
    throw error;
  }
}

export async function getDepositById(depositId: string) {
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
       from deposits where id = $1 limit 1`,
    [depositId],
  );
  return result.rows[0] ?? null;
}

export async function getDepositByReference(reference: string) {
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
       from deposits where provider_reference = $1 or id::text = $1 limit 1`,
    [reference],
  );
  return result.rows[0] ?? null;
}

export async function creditDepositFromVerification(input: {
  depositId: string;
  payload: VerificationPayload;
  actorUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<DepositVerificationResult> {
  const db = await getDb();
  const result: DepositVerificationResult = await db.transaction(async (tx) => {
    const deposit = await loadDepositForUpdate(tx, input.depositId);
    if (!deposit) {
      throw new AppError("NOT_FOUND", "That deposit could not be found.");
    }
    if (deposit.status === "credited") {
      return {
        status: "credited",
        deposit,
        alreadyCredited: true,
        message: "This payment has already been credited to your wallet.",
      };
    }
    try {
      await creditVerifiedDeposit(tx, deposit, input.payload, {
        actorUserId: input.actorUserId,
        ip: input.ip,
        userAgent: input.userAgent,
      });
    } catch (error) {
      if (error instanceof AppError && error.code === "PAYMENT_FAILED") {
        await tx.query(
          `update deposits
              set status = 'failed', updated_at = now(),
                  metadata = metadata || $2::jsonb
            where id = $1 and status <> 'credited'`,
          [
            deposit.id,
            JSON.stringify({
              verificationError: "amount_currency_or_status_mismatch",
            }),
          ],
        );
        await writeAuditLog(tx, {
          actorUserId: input.actorUserId ?? deposit.userId,
          actorRole: "customer",
          action: "deposit.verification_failed",
          entityType: "deposit",
          entityId: deposit.id,
          metadata: { reason: "verification_mismatch" },
          ip: input.ip,
          userAgent: input.userAgent,
        });
        return {
          status: "failed",
          deposit: { ...deposit, status: "failed" },
          message: error.userMessage,
        };
      }
      throw error;
    }
    const updated = await loadDepositForUpdate(tx, input.depositId);
    return {
      status: "credited",
      deposit: updated,
      message: "Payment confirmed. Your BUYBIZ wallet has been credited.",
    };
  });
  if (result.status === "credited") await flushEmailQueue(10);
  return result;
}

export async function verifyAndCreditDeposit(input: {
  reference: string;
  userId?: string;
  actorUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<DepositVerificationResult> {
  const deposit = await getDepositByReference(input.reference);
  if (!deposit) {
    throw new AppError("NOT_FOUND", "That deposit could not be found.");
  }
  if (input.userId && deposit.userId !== input.userId) {
    throw new AppError("FORBIDDEN", "You cannot view that deposit.");
  }
  if (deposit.status === "credited") {
    return {
      status: "credited",
      deposit,
      alreadyCredited: true,
      message: "This payment has already been credited to your wallet.",
    };
  }
  if (["failed", "abandoned", "reversed"].includes(deposit.status)) {
    return {
      status: deposit.status,
      deposit,
      message: "This payment did not complete. Your wallet was not credited.",
    };
  }
  if (deposit.provider === "demo") {
    return {
      status: deposit.status,
      deposit,
      message:
        deposit.status === "pending"
          ? "This is a demo deposit. Complete it on the demo checkout page."
          : "This demo deposit is not pending.",
    };
  }
  if (!isPaystackConfigured()) {
    throw new AppError(
      "CONFIGURATION",
      "Payments are not configured. Your wallet has not been credited.",
    );
  }

  const transaction = await verifyPaystackTransaction(deposit.providerReference);
  const payload = normalizePayload(transaction);
  if (payload.status === "success") {
    return creditDepositFromVerification({
      depositId: deposit.id,
      payload,
      actorUserId: input.actorUserId ?? deposit.userId,
      ip: input.ip,
      userAgent: input.userAgent,
    });
  }

  const mapped: DepositStatus =
    payload.status === "failed"
      ? "failed"
      : payload.status === "abandoned"
        ? "abandoned"
        : payload.status === "reversed"
          ? "reversed"
          : "pending";
  if (mapped !== "pending" || deposit.status === "initiated") {
    const db = await getDb();
    await db.query(
      `update deposits set status = $2, provider_transaction_id = $3,
              channel = $4, updated_at = now() where id = $1`,
      [
        deposit.id,
        mapped,
        payload.id ? String(payload.id) : null,
        payload.channel ?? null,
      ],
    );
  }
  return {
    status: mapped,
    deposit: { ...deposit, status: mapped },
    message:
      mapped === "pending"
        ? "Paystack is still confirming this payment. Refresh in a moment."
        : "This payment was not successful. You can initiate a new deposit.",
  };
}

export async function completeDemoDeposit(input: {
  depositId: string;
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<DepositVerificationResult> {
  if (!isDemoMode()) {
    throw new AppError("FORBIDDEN", "Demo payments are disabled.");
  }
  const deposit = await getDepositById(input.depositId);
  if (!deposit) throw new AppError("NOT_FOUND", "That demo deposit was not found.");
  if (deposit.userId !== input.userId) {
    throw new AppError("FORBIDDEN", "You cannot complete that deposit.");
  }
  if (deposit.provider !== "demo") {
    throw new AppError("FORBIDDEN", "This is not a demo deposit.");
  }
  if (deposit.status === "credited") {
    return {
      status: "credited",
      deposit,
      alreadyCredited: true,
      message: "This demo payment was already credited.",
    };
  }
  if (deposit.status !== "pending" && deposit.status !== "initiated") {
    throw new AppError(
      "PAYMENT_FAILED",
      "This demo payment is no longer pending.",
    );
  }
  return creditDepositFromVerification({
    depositId: deposit.id,
    payload: {
      status: "success",
      reference: deposit.providerReference,
      amount: deposit.amountMinor,
      currency: "NGN",
      id: `demo-${deposit.id}`,
      fees: 0,
      channel: "demo",
      domain: undefined,
    },
    actorUserId: input.userId,
    ip: input.ip,
    userAgent: input.userAgent,
  });
}

export async function cancelDemoDeposit(input: {
  depositId: string;
  userId: string;
}) {
  if (!isDemoMode()) throw new AppError("FORBIDDEN", "Demo payments are disabled.");
  const db = await getDb();
  const deposit = await getDepositById(input.depositId);
  if (!deposit || deposit.userId !== input.userId || deposit.provider !== "demo") {
    throw new AppError("NOT_FOUND", "That deposit could not be found.");
  }
  if (deposit.status === "credited") {
    return { cancelled: false };
  }
  await db.query(
    `update deposits set status = 'abandoned', updated_at = now()
      where id = $1 and status in ('initiated','pending')`,
    [deposit.id],
  );
  return { cancelled: true };
}

async function recordWebhookEvent(input: {
  event: PaystackWebhookEvent;
  payloadHash: string;
}) {
  const db = await getDb();
  const reference = webhookEventReference(input.event);
  const inserted = await db.query<{ id: string }>(
    `insert into webhook_events
       (provider, provider_event_reference, event_type, payload_hash, status)
     values ('paystack',$1,$2,$3,'received')
     on conflict (provider, provider_event_reference) do nothing
     returning id`,
    [reference, input.event.event, input.payloadHash],
  );
  return { id: inserted.rows[0]?.id ?? null, reference };
}

export async function processPaystackWebhook(input: {
  rawBody: string;
  signature: string | null;
}): Promise<{ ok: boolean; duplicate?: boolean; message: string }> {
  if (!isPaystackConfigured()) {
    throw new AppError("CONFIGURATION", "Paystack is not configured.");
  }
  if (!verifyPaystackSignature(input.rawBody, input.signature)) {
    throw new AppError("FORBIDDEN", "Invalid Paystack webhook signature.");
  }
  const event = parsePaystackWebhook(input.rawBody);
  if (!event) {
    throw new AppError("VALIDATION", "Unreadable webhook payload.");
  }

  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
  const recorded = await recordWebhookEvent({ event, payloadHash });
  if (!recorded.id) {
    return { ok: true, duplicate: true, message: "Duplicate webhook ignored." };
  }

  const db = await getDb();
  try {
    if (event.event !== "charge.success") {
      await db.query(
        `update webhook_events set status = 'ignored', processed_at = now() where id = $1`,
        [recorded.id],
      );
      return { ok: true, message: "Event acknowledged." };
    }

    const reference = event.data.reference;
    if (!reference) {
      await db.query(
        `update webhook_events set status = 'ignored', processed_at = now(),
                error_detail = 'Missing reference' where id = $1`,
        [recorded.id],
      );
      return { ok: true, message: "Event acknowledged." };
    }

    const deposit = await getDepositByReference(reference);
    if (!deposit || deposit.provider !== "paystack") {
      await db.query(
        `update webhook_events set status = 'ignored', processed_at = now(),
                error_detail = 'Unknown deposit reference' where id = $1`,
        [recorded.id],
      );
      return { ok: true, message: "Event acknowledged." };
    }

    // Signed webhooks are trusted for authenticity, but we still verify the
    // transaction server-side before money is credited.
    if (deposit.status !== "credited") {
      const transaction = await verifyPaystackTransaction(
        deposit.providerReference,
      );
      const payload = normalizePayload(transaction);
      if (payload.status !== "success") {
        // A charge.success webhook must verify as successful server-side. If
        // Paystack is still settling, fail the webhook so Paystack retries.
        throw new AppError(
          "PAYMENT_FAILED",
          `Paystack verification returned ${payload.status}.`,
        );
      }
      await creditDepositFromVerification({
        depositId: deposit.id,
        payload,
        actorUserId: deposit.userId,
      });
    }

    await db.query(
      `update webhook_events set status = 'processed', processed_at = now() where id = $1`,
      [recorded.id],
    );
    return { ok: true, message: "Webhook processed." };
  } catch (error) {
    await db
      .query(
        `update webhook_events set status = 'failed', processed_at = now(),
                error_detail = $2 where id = $1`,
        [recorded.id, (error as Error).message.slice(0, 500)],
      )
      .catch(() => undefined);
    throw error;
  }
}

export async function reconcilePendingDeposits() {
  if (!isPaystackConfigured() || isDemoMode()) {
    return { checked: 0, credited: 0, failed: 0 };
  }
  const db = await getDb();
  const pending = await db.query<{ reference: string }>(
    `select provider_reference as reference from deposits
      where provider = 'paystack' and status in ('initiated','pending')
        and created_at <= now() - interval '10 minutes'
      order by created_at asc limit 10`,
  );
  let credited = 0;
  let failed = 0;
  for (const row of pending.rows) {
    try {
      const result = await verifyAndCreditDeposit({ reference: row.reference });
      if (result.status === "credited") credited += 1;
      if (result.status === "failed" || result.status === "abandoned") failed += 1;
    } catch (error) {
      console.error("[buybiz/deposits] reconciliation failed", (error as Error).message);
    }
  }
  return { checked: pending.rows.length, credited, failed };
}

export async function enforceDepositRateLimit(userId: string) {
  return rateLimit({
    action: "wallet:deposit",
    identifier: userId,
    limit: 6,
    windowSeconds: 300,
  });
}
