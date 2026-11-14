"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guards";
import { AppError, toUserMessage } from "@/lib/errors";
import { formError, formSuccess, type ActionState } from "@/lib/validation/action-state";
import { reviewCampaignPayout, updateCampaign } from "@/server/services/campaigns";

function numberField(formData: FormData, key: string) {
  const value = Number(String(formData.get(key) ?? ""));
  if (!Number.isFinite(value)) throw new AppError("VALIDATION", `Enter a valid ${key}.`);
  return value;
}

export async function saveCampaignAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let admin;
  try { admin = await requireAdmin(); } catch (error) { return formError(toUserMessage(error)); }
  try {
    const id = String(formData.get("campaignId") ?? "").trim() || undefined;
    const statusValue = String(formData.get("status") ?? "draft");
    const status = ["draft", "published", "paused"].includes(statusValue)
      ? (statusValue as "draft" | "published" | "paused")
      : "draft";
    const slugs = String(formData.get("eligibleProductSlugs") ?? "")
      .split(",").map((value) => value.trim()).filter(Boolean);
    const campaignId = await updateCampaign({
      actorId: admin.id,
      actorRole: admin.role,
      id,
      slug: String(formData.get("slug") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      status,
      customerRewardUsd: numberField(formData, "customerRewardUsd"),
      referrerRewardUsd: numberField(formData, "referrerRewardUsd"),
      qualifyingDepositNgn: numberField(formData, "qualifyingDepositNgn"),
      eligibleProductSlugs: slugs,
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt: String(formData.get("endsAt") ?? ""),
      payoutAt: String(formData.get("payoutAt") ?? ""),
      terms: String(formData.get("terms") ?? "").trim(),
    });
    revalidatePath("/admin/campaigns");
    revalidatePath("/dashboard/referrals");
    revalidatePath("/");
    const campaign = String(formData.get("slug") ?? "");
    if (campaign) revalidatePath(`/campaigns/${campaign}`);
    return formSuccess(`Campaign saved (${campaignId.slice(0, 8)}…).`);
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/campaign-admin] save failed", error);
    return formError(toUserMessage(error));
  }
}

export async function setCampaignStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let admin;
  try { admin = await requireAdmin(); } catch (error) { return formError(toUserMessage(error)); }
  try {
    const campaignId = String(formData.get("campaignId") ?? "");
    const status = String(formData.get("status") ?? "draft");
    const next = ["draft", "published", "paused"].includes(status)
      ? (status as "draft" | "published" | "paused")
      : "draft";
    const db = await import("@/lib/db").then((mod) => mod.getDb());
    await db.transaction(async (tx) => {
      await tx.query(`update campaigns set status=$2, published_at=case when $2='published' then coalesce(published_at,now()) else published_at end, updated_at=now() where id=$1`, [campaignId, next]);
      await tx.query(
        `insert into audit_logs (actor_user_id, actor_role, action, entity_type, entity_id, metadata)
         values ($1,$2,'campaign.status_changed','campaign',$3,$4::jsonb)`,
        [admin.id, admin.role, campaignId, JSON.stringify({ status: next })],
      );
    });
    revalidatePath("/admin/campaigns"); revalidatePath("/dashboard/referrals"); revalidatePath("/");
    return formSuccess(next === "published" ? "Campaign published." : next === "paused" ? "Campaign paused." : "Campaign moved to draft.");
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    return formError(toUserMessage(error));
  }
}

export async function reviewCampaignPayoutAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let admin;
  try { admin = await requireAdmin(); } catch (error) { return formError(toUserMessage(error)); }
  try {
    const decision = String(formData.get("decision") ?? "");
    if (!["approve", "processing", "paid", "reject"].includes(decision)) {
      return formError("Choose a valid payout decision.");
    }
    await reviewCampaignPayout({
      actorId: admin.id,
      actorRole: admin.role,
      payoutId: String(formData.get("payoutId") ?? ""),
      decision: decision as "approve" | "processing" | "paid" | "reject",
      transactionHash: String(formData.get("transactionHash") ?? "").trim(),
      reason: String(formData.get("reason") ?? "").trim(),
    });
    revalidatePath("/admin/campaigns");
    revalidatePath("/dashboard/referrals");
    return formSuccess(`Payout ${decision === "paid" ? "marked paid" : decision === "reject" ? "rejected" : decision}.`);
  } catch (error) {
    if (error instanceof AppError) return formError(error.userMessage);
    console.error("[buybiz/campaign-admin] payout failed", error);
    return formError(toUserMessage(error));
  }
}
