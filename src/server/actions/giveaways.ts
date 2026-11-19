"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage, requireUserPage } from "@/server/auth/guards";
import { claimGiveaway, createGiveaway, getGiveawayCode, setGiveawayStatus, submitGiveawayWallet, announceGiveaway } from "@/server/services/giveaways";
import { formError, formSuccess, type ActionState } from "@/lib/validation/action-state";
import { AppError } from "@/lib/errors";

export async function claimGiveawayAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUserPage();
  try {
    const claim = await claimGiveaway({
      userId: user.id,
      giveawayId: String(formData.get("giveawayId") ?? ""),
      code: String(formData.get("code") ?? ""),
    });
    revalidatePath("/dashboard/giveaways");
    return formSuccess("Claim successful. Add your USDT BEP20 payout address to receive the reward.", { claimId: claim.claimId });
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/giveaway] claim failed", error);
    return formError("We could not process that claim. Please try again.");
  }
}

export async function submitGiveawayWalletAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUserPage();
  try {
    await submitGiveawayWallet({
      userId: user.id,
      claimId: String(formData.get("claimId") ?? ""),
      address: String(formData.get("address") ?? ""),
    });
    revalidatePath("/dashboard/giveaways");
    return formSuccess("Payout address saved. An administrator will review the payment.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/giveaway] wallet submit failed", error);
    return formError("We could not save that address. Please try again.");
  }
}

export async function createGiveawayAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdminPage();
  try {
    const result = await createGiveaway({
      adminId: admin.id,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      rewardCents: Math.round(Number(formData.get("rewardUsd") ?? 0) * 100),
      claimLimit: Number(formData.get("claimLimit") ?? 20),
      asset: String(formData.get("asset") ?? "USDT").toUpperCase(),
      network: String(formData.get("network") ?? "BEP20").toUpperCase(),
      startsAt: formData.get("startsAt") ? new Date(String(formData.get("startsAt"))) : null,
      endsAt: formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : null,
    });
    revalidatePath("/admin/giveaways");
    return formSuccess(`Giveaway created. Claim code: ${result.code}. Keep it private.`);
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/giveaway] create failed", error);
    return formError("We could not create that giveaway.");
  }
}

export async function giveawayStatusAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminPage();
  const id = String(formData.get("giveawayId") ?? "");
  const status = String(formData.get("status") ?? "") as "draft"|"scheduled"|"active"|"paused"|"ended"|"claimed";
  try {
    await setGiveawayStatus(id, status);
    if (status === "active") await announceGiveaway(id);
    revalidatePath("/admin/giveaways");
    revalidatePath("/dashboard/giveaways");
    return formSuccess(`Giveaway status set to ${status}.`);
  } catch (error) {
    return formError(error instanceof AppError ? error.userMessage : "Could not update giveaway.");
  }
}

export async function revealGiveawayCodeAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdminPage();
  try {
    const code = await getGiveawayCode(String(formData.get("giveawayId") ?? ""));
    return formSuccess(`Claim code: ${code}`);
  } catch {
    return formError("Could not reveal that code.");
  }
}
