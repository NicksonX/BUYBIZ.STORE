"use server";

import { revalidatePath } from "next/cache";
import { requireUserPage } from "@/server/auth/guards";
import { AppError, toUserMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { formError, formSuccess, type ActionState } from "@/lib/validation/action-state";
import { requestCampaignPayout } from "@/server/services/campaigns";

export async function requestCampaignPayoutAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserPage();
  const limit = await rateLimit({
    action: "campaign:payout",
    identifier: user.id,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) return formError("Too many payout attempts. Try again later.");
  if (formData.get("confirm") !== "on") {
    return formError("Confirm that your verified BEP20 address is correct.");
  }
  try {
    const payout = await requestCampaignPayout(user.id);
    revalidatePath("/dashboard/referrals");
    return formSuccess(
      `Payout request for ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(payout.amountCents / 100)} submitted for review.`,
    );
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/campaign] payout request failed", error);
    return formError(toUserMessage(error));
  }
}
