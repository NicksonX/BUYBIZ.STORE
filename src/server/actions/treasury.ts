"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPage } from "@/server/auth/guards";
import { formError, formSuccess, type ActionState } from "@/lib/validation/action-state";
import { AppError } from "@/lib/errors";
import { approveGiveawayBatch, attestTreasuryWallet, prepareGiveawayBatch, recordGiveawayPayment, saveTreasuryWallet } from "@/server/services/treasury";

async function owner() {
  const admin = await requireAdminPage();
  if (admin.role !== "super_admin") throw new AppError("FORBIDDEN", "Only the treasury owner can perform this action.");
  return admin;
}

export async function saveTreasuryWalletAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await owner();
    await saveTreasuryWallet({ adminId: admin.id, address: String(formData.get("address") ?? ""), label: String(formData.get("label") ?? "") });
    revalidatePath("/admin/treasury");
    return formSuccess("Treasury address saved. Confirm ownership attestation before enabling.");
  } catch (e) { return formError(e instanceof AppError ? e.userMessage : "Could not save treasury address."); }
}

export async function attestTreasuryAction(_previous: ActionState, _formData: FormData): Promise<ActionState> {
  try { const admin = await owner(); await attestTreasuryWallet(admin.id); revalidatePath("/admin/treasury"); return formSuccess("Treasury enabled for read-only monitoring. Hardware wallet signing remains manual."); }
  catch (e) { return formError(e instanceof AppError ? e.userMessage : "Could not enable treasury."); }
}

export async function prepareBatchAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await owner();
    const r = await prepareGiveawayBatch(String(formData.get("giveawayId") ?? ""), admin.id);
    revalidatePath("/admin/treasury");
    return formSuccess(`Prepared ${r.itemCount} payments totaling $${(r.totalCents / 100).toFixed(2)}.`);
  } catch (e) { return formError(e instanceof AppError ? e.userMessage : "Could not prepare batch."); }
}

export async function approveBatchAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  try { const admin = await owner(); await approveGiveawayBatch(String(formData.get("batchId") ?? ""), admin.id); revalidatePath("/admin/treasury"); return formSuccess("Batch approved for manual hardware-wallet signing."); }
  catch (e) { return formError(e instanceof AppError ? e.userMessage : "Could not approve batch."); }
}

export async function recordPaymentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await owner();
    await recordGiveawayPayment({ itemId: String(formData.get("itemId") ?? ""), txHash: String(formData.get("txHash") ?? "") });
    revalidatePath("/admin/treasury");
    revalidatePath("/dashboard/giveaways");
    return formSuccess("Confirmed BSC transaction recorded. Winner email queued.");
  } catch (e) { return formError(e instanceof AppError ? e.userMessage : "Could not verify that transaction."); }
}
