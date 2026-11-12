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
  ticketReplySchema,
  ticketSchema,
  zodFieldErrors,
} from "@/lib/validation/schemas";
import {
  formError,
  formSuccess,
  type ActionState,
} from "@/lib/validation/action-state";
import { requireUserPage, requireVerifiedUser } from "@/server/auth/guards";
import { purchaseProxy } from "@/server/services/purchase";
import { renewProxy } from "@/server/services/renewals";
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
    const outcome = await purchaseProxy({
      userId: user.id,
      productSlug: parsed.data.productSlug,
      idempotencyKey: parsed.data.idempotencyKey,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    if (outcome.outcome === "allocated") {
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
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/support] reply failed", error);
    return formError(toUserMessage(error));
  }
  revalidatePath(`/dashboard/support/${parsed.data.ticketId}`);
  revalidatePath("/dashboard/support");
  return formSuccess("Reply sent.");
}
