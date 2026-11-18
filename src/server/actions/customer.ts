"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { AppError, toUserMessage } from "@/lib/errors";
import { isDemoMode } from "@/lib/config";
import { getRequestMeta, rateLimit } from "@/lib/security/rate-limit";
import { parseNairaToKobo } from "@/lib/utils";
import {
  depositSchema,
  purchaseSchema,
  renewalSchema,
  switchProxySchema,
  terminateProxySchema,
  ticketReplySchema,
  ticketSchema,
  zodFieldErrors,
} from "@/lib/validation/schemas";
import {
  formError,
  formSuccess,
  type ActionState,
} from "@/lib/validation/action-state";
import { getCurrentUser } from "@/server/auth/session";
import { requireUserPage, requireVerifiedUser } from "@/server/auth/guards";
import { purchaseProxy } from "@/server/services/purchase";
import { renewProxy } from "@/server/services/renewals";
import {
  switchProxy,
  terminateProxy,
} from "@/server/services/proxy-management";
import {
  cancelDemoDeposit,
  completeDemoDeposit,
  createDeposit,
  enforceDepositRateLimit,
  getDepositById,
} from "@/server/services/deposits";
import {
  createSupportTicket,
  replyToOwnTicket,
} from "@/server/services/support";
import { getTicketForUser } from "@/server/data/customer";
import { getAppSettings } from "@/server/data/settings";
import { writeAuditLog } from "@/server/services/audit";
import { flushEmailQueue } from "@/server/services/email";
import { autoReplyToTicket, rateSupportTicket } from "@/server/services/support-automation";

export async function purchaseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser();
  const meta = await getRequestMeta();
  const limit = await rateLimit({
    action: "purchase",
    identifier: user.id,
    limit: 10,
    windowSeconds: 60,
  });
  if (!limit.allowed) {
    return formError("Too many purchase attempts. Please wait a minute.");
  }

  const parsed = purchaseSchema.safeParse({
    productSlug: formData.get("productSlug"),
    idempotencyKey: formData.get("idempotencyKey"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return formError(
      "Please confirm the wallet debit before purchasing.",
      zodFieldErrors(parsed.error),
    );
  }

  let destination: string | null = null;
  try {
    const rawCountry = String(formData.get("countryCode") ?? "").toUpperCase();
    const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
    const outcome = await purchaseProxy({
      userId: user.id,
      productSlug: parsed.data.productSlug,
      idempotencyKey: parsed.data.idempotencyKey,
      countryCode,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    if (outcome.outcome === "allocated") {
      await flushEmailQueue(10);
      destination = `/dashboard/proxies/${outcome.allocationId}?new=1`;
    } else {
      destination = `/dashboard/orders/${outcome.orderId}?refunded=1`;
    }
  } catch (error) {
    if (error instanceof AppError) {
      return formError(error.userMessage);
    }
    console.error("[buybiz/purchase] failed", error);
    return formError(toUserMessage(error));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/proxies");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/transactions");
  if (destination) redirect(destination);
  return formError("The purchase could not be completed.");
}

export async function renewProxyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser();
  const parsed = renewalSchema.safeParse({
    allocationId: formData.get("allocationId"),
    idempotencyKey: formData.get("idempotencyKey"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return formError(
      "Please confirm the renewal debit.",
      zodFieldErrors(parsed.error),
    );
  }
  const meta = await getRequestMeta();
  const limit = await rateLimit({
    action: "renewal",
    identifier: user.id,
    limit: 10,
    windowSeconds: 60,
  });
  if (!limit.allowed) {
    return formError("Too many renewal attempts. Please wait a minute.");
  }
  try {
    const result = await renewProxy({
      userId: user.id,
      allocationId: parsed.data.allocationId,
      idempotencyKey: parsed.data.idempotencyKey,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/proxies");
    revalidatePath(`/dashboard/proxies/${parsed.data.allocationId}`);
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/orders");
    return formSuccess(
      `Proxy renewed. New expiry ${result.newExpiresAt.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Lagos",
      })} WAT.`,
    );
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/renewal] failed", error);
    return formError(
      toUserMessage(error, "The proxy could not be renewed. Nothing was charged."),
    );
  }
}

export async function initializeDepositAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser();
  const limit = await enforceDepositRateLimit(user.id);
  if (!limit.allowed) {
    return formError(
      `Too many deposit attempts. Try again in ${Math.max(
        1,
        Math.ceil(limit.retryAfterSeconds / 60),
      )} minute(s).`,
    );
  }

  const parsed = depositSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return formError("Enter a valid amount.", zodFieldErrors(parsed.error));
  }
  const amountMinor = parseNairaToKobo(parsed.data.amount);
  if (amountMinor === null) {
    return formError("Enter a valid NGN amount, for example 10000 or 10,000.");
  }

  const meta = await getRequestMeta();
  let url: string | null = null;
  try {
    const deposit = await createDeposit({
      user,
      amountMinor,
      clientReference: String(formData.get("clientReference") ?? ""),
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    url = deposit.authorizationUrl;
    revalidatePath("/dashboard/wallet");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/deposit] initialize failed", error);
    return formError(toUserMessage(error));
  }
  if (url) redirect(url);
  return formError("The deposit could not be started.");
}

export async function completeDemoDepositAction(formData: FormData) {
  const user = await requireUserPage();
  if (!isDemoMode()) redirect("/dashboard/wallet");
  const depositId = String(formData.get("depositId") ?? "");
  const deposit = await getDepositById(depositId);
  if (!deposit || deposit.userId !== user.id) redirect("/dashboard/wallet");
  const meta = await getRequestMeta();
  try {
    await completeDemoDeposit({
      depositId,
      userId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  } catch (error) {
    console.error("[buybiz/deposit] demo completion failed", error);
    redirect(`/dashboard/wallet/demo/${depositId}?error=1`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/transactions");
  redirect(
    `/dashboard/wallet/callback?reference=${encodeURIComponent(
      deposit.providerReference,
    )}`,
  );
}

export async function cancelDemoDepositAction(formData: FormData) {
  const user = await requireUserPage();
  const depositId = String(formData.get("depositId") ?? "");
  await cancelDemoDeposit({ depositId, userId: user.id }).catch(() => undefined);
  redirect("/dashboard/wallet");
}

export async function reactivateAccountAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/reactivate");
  if (user.status !== "frozen") {
    redirect(user.role === "customer" ? "/dashboard" : "/admin");
  }

  const limit = await rateLimit({
    action: "account:reactivate",
    identifier: user.id,
    limit: 5,
    windowSeconds: 300,
  });
  if (!limit.allowed) return formError("Too many attempts. Please wait a few minutes.");

  const settings = await getAppSettings();
  const fee = settings.reactivationFeeMinor;
  const db = await getDb();
  const meta = await getRequestMeta();

  try {
    await db.transaction(async (tx) => {
      const locked = await tx.query<{
        status: string;
        username: string;
      }>(
        `select status, username from profiles where id = $1 for update`,
        [user.id],
      );
      const profile = locked.rows[0];
      if (!profile) throw new AppError("NOT_FOUND", "Your account could not be found.");
      if (profile.status !== "frozen") {
        throw new AppError("CONFLICT", "This account is not frozen.");
      }

      let freeze = await tx.query<{ id: string }>(
        `select f.id
           from account_freezes f
           left join account_reactivations r on r.freeze_id = f.id
          where f.user_id = $1 and r.id is null
          order by f.frozen_at desc
          limit 1
          for update of f`,
        [user.id],
      );
      if (!freeze.rows[0]) {
        const created = await tx.query<{ id: string }>(
          `insert into account_freezes (user_id, reason, last_activity_at, frozen_at)
           values ($1, 'inactivity', $2, $3)
           returning id`,
          [user.id, user.lastActivityAt ?? new Date(), user.frozenAt ?? new Date()],
        );
        freeze = created;
      }

      await tx.query(
        `insert into wallet_accounts (user_id) values ($1)
         on conflict (user_id) do nothing`,
        [user.id],
      );
      const wallet = await tx.query<{ id: string }>(
        `select id from wallet_accounts where user_id = $1 for update`,
        [user.id],
      );
      if (!wallet.rows[0]) throw new AppError("UNKNOWN", "Your wallet could not be loaded.");
      const balanceResult = await tx.query<{ balance: number }>(
        `select coalesce(sum(amount_minor),0)::bigint as balance
           from wallet_ledger where wallet_account_id = $1`,
        [wallet.rows[0].id],
      );
      const balance = Number(balanceResult.rows[0]?.balance ?? 0);
      if (fee > 0 && balance < fee) {
        throw new AppError(
          "INSUFFICIENT_BALANCE",
          "Your preserved credit is below the reactivation fee. Contact support or an administrator. Your balance has not been changed.",
        );
      }

      if (fee > 0) {
        await tx.query(
          `insert into wallet_ledger
             (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
              currency, reference, description, created_by)
           values ($1,$2,'admin_debit',$3,$4,'NGN',$5,$6,$2)`,
          [
            wallet.rows[0].id,
            user.id,
            -fee,
            balance - fee,
            `reactivation:${freeze.rows[0].id}`,
            "Account reactivation fee",
          ],
        );
      }

      await tx.query(
        `insert into account_reactivations
           (freeze_id, user_id, method, fee_minor, reactivated_by, notes, reactivated_at)
         values ($1,$2,'wallet',$3,$2,'Customer self-reactivation',$4)`,
        [freeze.rows[0].id, user.id, fee, new Date()],
      );
      await tx.query(
        `update profiles
            set status = 'active',
                frozen_at = null,
                freeze_reason = null,
                last_activity_at = now(),
                last_reactivated_at = now(),
                updated_at = now()
          where id = $1`,
        [user.id],
      );
      await tx.query(
        `insert into notifications (user_id, type, title, body, href)
         values ($1,'security','Your account is active again',$2,'/dashboard')`,
        [
          user.id,
          fee > 0
            ? `Your BUYBIZ account was reactivated. ${formatNairaValue(fee)} was deducted from your preserved credit.`
            : "Your BUYBIZ account was reactivated. Your preserved credit is unchanged.",
        ],
      );
      await writeAuditLog(tx, {
        actorUserId: user.id,
        actorRole: "customer",
        action: "account.reactivated",
        entityType: "profile",
        entityId: user.id,
        metadata: { method: "wallet", feeMinor: fee, freezeId: freeze.rows[0].id },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    });
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/account] reactivation failed", error);
    return formError(toUserMessage(error));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/reactivate");
  redirect("/dashboard");
}

function formatNairaValue(minor: number) {
  return `₦${(minor / 100).toLocaleString("en-NG")}`;
}

export async function terminateProxyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser();
  const parsed = terminateProxySchema.safeParse({
    allocationId: formData.get("allocationId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return formError("Confirm that you want to terminate this proxy.", zodFieldErrors(parsed.error));
  }

  const meta = await getRequestMeta();
  const limit = await rateLimit({
    action: "proxy:terminate",
    identifier: user.id,
    limit: 5,
    windowSeconds: 60,
  });
  if (!limit.allowed) return formError("Too many attempts. Please wait a minute.");

  try {
    await terminateProxy({
      userId: user.id,
      allocationId: parsed.data.allocationId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/proxy] termination failed", error);
    return formError(toUserMessage(error));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/proxies");
  revalidatePath(`/dashboard/proxies/${parsed.data.allocationId}`);
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/transactions");
  redirect(`/dashboard/proxies/${parsed.data.allocationId}?terminated=1`);
}

export async function switchProxyAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireVerifiedUser();
  const parsed = switchProxySchema.safeParse({
    allocationId: formData.get("allocationId"),
    inventoryId: formData.get("inventoryId"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return formError("Choose an available proxy and confirm the switch.", zodFieldErrors(parsed.error));
  }

  const meta = await getRequestMeta();
  const limit = await rateLimit({
    action: "proxy:switch",
    identifier: user.id,
    limit: 8,
    windowSeconds: 60,
  });
  if (!limit.allowed) return formError("Too many attempts. Please wait a minute.");

  try {
    await switchProxy({
      userId: user.id,
      allocationId: parsed.data.allocationId,
      inventoryId: parsed.data.inventoryId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/proxy] switch failed", error);
    return formError(toUserMessage(error));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/proxies");
  revalidatePath(`/dashboard/proxies/${parsed.data.allocationId}`);
  redirect(`/dashboard/proxies/${parsed.data.allocationId}?switched=1`);
}

export async function markAllNotificationsReadAction() {
  const user = await requireUserPage();
  const db = await getDb();
  await db.query(
    `update notifications set read_at = now()
      where user_id = $1 and read_at is null`,
    [user.id],
  );
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
}

export async function createTicketAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserPage();
  const limit = await rateLimit({
    action: "support:create",
    identifier: user.id,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return formError("You have opened several tickets recently. Please wait before opening another.");
  }
  const parsed = ticketSchema.safeParse({
    subject: formData.get("subject"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }
  let destination: string | null = null;
  try {
    const ticket = await createSupportTicket({
      userId: user.id,
      subject: parsed.data.subject,
      category: parsed.data.category,
      priority: parsed.data.priority,
      message: parsed.data.message,
    });
    destination = `/dashboard/support/${ticket.ticketId}`;
    await autoReplyToTicket({ ticketId: ticket.ticketId, userId: user.id, subject: parsed.data.subject, message: parsed.data.message }).catch((error) => console.error("[buybiz/support] auto reply failed", error));
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/support] create failed", error);
    return formError(toUserMessage(error));
  }
  revalidatePath("/dashboard/support");
  if (destination) redirect(destination);
  return formError("The ticket could not be created.");
}

export async function replyToTicketAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserPage();
  const limit = await rateLimit({
    action: "support:reply",
    identifier: user.id,
    limit: 20,
    windowSeconds: 3600,
  });
  if (!limit.allowed) return formError("Too many replies. Please wait a moment.");

  const parsed = ticketReplySchema.safeParse({
    ticketId: formData.get("ticketId"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return formError("Write a message.", zodFieldErrors(parsed.error));
  }
  const owned = await getTicketForUser(user.id, parsed.data.ticketId);
  if (!owned) return formError("That ticket could not be found.");
  try {
    await replyToOwnTicket({
      userId: user.id,
      ticketId: parsed.data.ticketId,
      message: parsed.data.message,
    });
    await autoReplyToTicket({ ticketId: parsed.data.ticketId, userId: user.id, subject: owned.ticket.subject, message: parsed.data.message }).catch((error) => console.error("[buybiz/support] auto reply failed", error));
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/support] reply failed", error);
    return formError(toUserMessage(error));
  }
  revalidatePath(`/dashboard/support/${parsed.data.ticketId}`);
  revalidatePath("/dashboard/support");
  return formSuccess("Reply sent.");
}


export async function rateSupportTicketAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUserPage();
  const ticketId = String(formData.get("ticketId") ?? "");
  const rating = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "");
  try {
    await rateSupportTicket({ userId: user.id, ticketId, rating, feedback });
    revalidatePath(`/dashboard/support/${ticketId}`);
    return formSuccess("Thank you. Your rating was recorded.");
  } catch (error) {
    return formError(error instanceof Error ? error.message : "Could not save your rating.");
  }
}
