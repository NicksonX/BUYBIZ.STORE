import "server-only";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

/**
 * INTERNAL TRANSFER DESIGN, DISABLED BY DEFAULT.
 *
 * This service is not wired to any customer UI or Server Action. It exists to
 * make the required controls explicit before the feature is ever enabled:
 *  - environment flag AND database setting must both be on;
 *  - sender and recipient must be active and email verified;
 *  - the recipient must be a BUYBIZ account, never an external bank account;
 *  - wallets are locked in deterministic order to avoid deadlocks;
 *  - the sender cannot go negative;
 *  - daily outgoing limits apply;
 *  - double-entry ledger references are unique and immutable;
 *  - no cash withdrawal or payout is created.
 *
 * Enabling this feature requires legal/compliance review because transferable
 * stored-value credit can function as a money transmission or cash-out channel.
 */
async function transfersEnabled(tx: SqlTransaction) {
  if (process.env.ENABLE_WALLET_TRANSFERS !== "true") return false;
  const setting = await tx.query<{ value: unknown }>(
    `select value from app_settings where key = 'wallet_transfers_enabled' limit 1`,
  );
  return setting.rows[0]?.value === true;
}

export async function transferWalletFunds(input: {
  senderId: string;
  recipientId: string;
  amountMinor: number;
  note?: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new AppError("VALIDATION", "Enter a valid transfer amount.");
  }
  if (input.senderId === input.recipientId) {
    throw new AppError("VALIDATION", "You cannot transfer funds to yourself.");
  }

  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await transfersEnabled(tx))) {
      throw new AppError(
        "FORBIDDEN",
        "Internal wallet transfers are disabled pending compliance review.",
      );
    }

    const parties = await tx.query<{
      id: string;
      role: string;
      status: string;
      emailVerified: boolean;
      username: string;
    }>(
      `select id, role, status, email_verified as "emailVerified", username
         from profiles where id in ($1,$2)`,
      [input.senderId, input.recipientId],
    );
    const sender = parties.rows.find((row) => row.id === input.senderId);
    const recipient = parties.rows.find((row) => row.id === input.recipientId);
    if (!sender || !recipient) {
      throw new AppError("NOT_FOUND", "Sender or recipient account not found.");
    }
    if (sender.status !== "active" || !sender.emailVerified) {
      throw new AppError("FORBIDDEN", "Your account must be active and verified.");
    }
    if (recipient.status !== "active" || !recipient.emailVerified) {
      throw new AppError(
        "VALIDATION",
        "The recipient must have an active, email-verified BUYBIZ account.",
      );
    }
    if (recipient.role !== "customer") {
      throw new AppError("VALIDATION", "Transfers are only allowed between customer wallets.");
    }

    const limitRows = await tx.query<{
      min: unknown;
      max: unknown;
      daily: unknown;
    }>(
      `select
         (select value from app_settings where key = 'wallet_transfer_min_minor') as min,
         (select value from app_settings where key = 'wallet_transfer_max_minor') as max,
         (select value from app_settings where key = 'wallet_transfer_daily_limit_minor') as daily`,
    );
    const limits = limitRows.rows[0];
    const min = Number(limits?.min ?? 10000);
    const max = Number(limits?.max ?? 10000000);
    const daily = Number(limits?.daily ?? 5000000);
    if (input.amountMinor < min || input.amountMinor > max) {
      throw new AppError("VALIDATION", "The amount is outside the transfer limits.");
    }
    const sentToday = await tx.query<{ total: unknown }>(
      `select coalesce(sum(amount_minor),0)::bigint as total
         from wallet_transfers
        where sender_user_id = $1 and status = 'completed'
          and created_at >= date_trunc('day', now())`,
      [input.senderId],
    );
    if (Number(sentToday.rows[0]?.total ?? 0) + input.amountMinor > daily) {
      throw new AppError("VALIDATION", "This would exceed your daily transfer limit.");
    }

    // Deterministic lock order prevents deadlocks between reciprocal transfers.
    const orderedIds = [input.senderId, input.recipientId].sort();
    await tx.query(
      `insert into wallet_accounts (user_id)
       select unnest(array[$1,$2]::uuid[])
       on conflict (user_id) do nothing`,
      orderedIds,
    );
    const wallets = await tx.query<{ id: string; userId: string }>(
      `select id, user_id as "userId" from wallet_accounts
        where user_id in ($1,$2)
        order by user_id
        for update`,
      [input.senderId, input.recipientId],
    );
    const senderWallet = wallets.rows.find((row) => row.userId === input.senderId);
    const recipientWallet = wallets.rows.find((row) => row.userId === input.recipientId);
    if (!senderWallet || !recipientWallet) {
      throw new AppError("UNKNOWN", "A wallet could not be loaded.");
    }
    const balances = await tx.query<{ userId: string; balance: unknown }>(
      `select user_id as "userId", sum(amount_minor)::bigint as balance
         from wallet_ledger where user_id in ($1,$2) group by user_id`,
      [input.senderId, input.recipientId],
    );
    const senderBalance = Number(
      balances.rows.find((row) => row.userId === input.senderId)?.balance ?? 0,
    );
    const recipientBalance = Number(
      balances.rows.find((row) => row.userId === input.recipientId)?.balance ?? 0,
    );
    if (senderBalance < input.amountMinor) {
      throw new AppError("INSUFFICIENT_BALANCE", "The sender has insufficient wallet credit.");
    }

    const transferId = randomUUID();
    const reference = `TRF-${randomUUID()}`;
    await tx.query(
      `insert into wallet_transfers
         (id, sender_user_id, recipient_user_id, amount_minor, currency, status, reference, note)
       values ($1,$2,$3,$4,'NGN','completed',$5,$6)`,
      [
        transferId,
        input.senderId,
        input.recipientId,
        input.amountMinor,
        reference,
        input.note?.slice(0, 300) ?? null,
      ],
    );
    await tx.query(
      `insert into wallet_ledger
         (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
          currency, reference, related_transfer_id, description)
       values ($1,$2,'transfer_debit',$3,$4,'NGN',$5,$6,$7)`,
      [
        senderWallet.id,
        input.senderId,
        -input.amountMinor,
        senderBalance - input.amountMinor,
        `transfer:${transferId}:debit`,
        transferId,
        `Transfer to @${recipient.username}`,
      ],
    );
    await tx.query(
      `insert into wallet_ledger
         (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
          currency, reference, related_transfer_id, description)
       values ($1,$2,'transfer_credit',$3,$4,'NGN',$5,$6,$7)`,
      [
        recipientWallet.id,
        input.recipientId,
        input.amountMinor,
        recipientBalance + input.amountMinor,
        `transfer:${transferId}:credit`,
        transferId,
        `Transfer from @${sender.username}`,
      ],
    );
    await notifyUser(tx, {
      userId: input.senderId,
      type: "system",
      title: "Wallet transfer sent",
      body: `You sent internal wallet credit to @${recipient.username}. This is not a cash withdrawal.`,
      href: "/dashboard/transactions",
    });
    await notifyUser(tx, {
      userId: input.recipientId,
      type: "system",
      title: "Wallet transfer received",
      body: `You received internal BUYBIZ wallet credit from @${sender.username}.`,
      href: "/dashboard/transactions",
    });
    await writeAuditLog(tx, {
      actorUserId: input.senderId,
      actorRole: "customer",
      action: "wallet.transfer_completed",
      entityType: "wallet_transfer",
      entityId: transferId,
      metadata: {
        senderId: input.senderId,
        recipientId: input.recipientId,
        amountMinor: input.amountMinor,
        internalCreditOnly: true,
      },
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return { transferId, reference, amountMinor: input.amountMinor };
  });
}
