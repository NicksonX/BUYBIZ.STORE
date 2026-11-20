"use server";

import { revalidatePath } from "next/cache";
import { requireUserPage } from "@/server/auth/guards";
import { AppError, toUserMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  formError,
  formSuccess,
  type ActionState,
} from "@/lib/validation/action-state";
import {
  requestAmbassadorWithdrawal,
  submitAmbassadorAddress,
} from "@/server/services/ambassador";
import { flushEmailQueue } from "@/server/services/email";

export async function submitAmbassadorAddressAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserPage();
  const limit = await rateLimit({
    action: "ambassador:address",
    identifier: user.id,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) return formError("Too many address attempts. Try again later.");
  const address = String(formData.get("address") ?? "").trim();
  try {
    await submitAmbassadorAddress(user.id, address);
    revalidatePath("/dashboard/rewards");
    revalidatePath("/dashboard/referrals");
    return formSuccess(
      "Address submitted. An administrator must verify it before you can request a payout.",
    );
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/ambassador] address submit failed", error);
    return formError(toUserMessage(error));
  }
}

export async function requestAmbassadorPayoutAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserPage();
  const limit = await rateLimit({
    action: "ambassador:payout",
    identifier: user.id,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) return formError("Too many payout attempts. Try again later.");
  if (formData.get("confirm") !== "on") {
    return formError("Confirm that the USDT address and amount are correct.");
  }
  const raw = String(formData.get("amount") ?? "").trim();
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return formError("Enter a valid USD amount.");
  }
  const amountCents = Math.round(amount * 100);
  if (Math.abs(amount * 100 - amountCents) > 0.001) {
    return formError("Use no more than two decimal places.");
  }
  try {
    const payout = await requestAmbassadorWithdrawal(user.id, amountCents);
    revalidatePath("/dashboard/rewards");
    await flushEmailQueue(5);
    return formSuccess(
      `Payout request for $${(payout.amountCents / 100).toFixed(2)} submitted. Processing can take up to 3 days.`,
    );
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/ambassador] payout request failed", error);
    return formError(toUserMessage(error));
  }
}
