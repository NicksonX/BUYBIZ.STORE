"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
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

export async function saveBroadcastHashAction(itemId: string, txHash: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireAdminPage();
  if (admin.role !== "super_admin") return { ok: false, message: "Only the super-admin can record payouts." };
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, message: "Invalid transaction hash." };
  const db = await getDb();
  const existing = await db.query<{ status: string; transactionHash: string | null }>(`select status,transaction_hash as "transactionHash" from giveaway_payment_items where id=$1 limit 1`, [itemId]);
  if (!existing.rows[0]) return { ok: false, message: "Payout item not found." };
  if (existing.rows[0].transactionHash && existing.rows[0].transactionHash !== txHash) return { ok: false, message: "A different transaction hash is already attached to this winner. Do not resend." };
  if (!existing.rows[0].transactionHash) await db.query(`update giveaway_payment_items set transaction_hash=$2,status='broadcast' where id=$1 and transaction_hash is null`, [itemId, txHash]);
  revalidatePath("/admin/giveaways/payouts");
  return { ok: true, message: "Transaction hash saved. Verify it; do not resend." };
}

export async function recordPaymentByHashAction(itemId: string, txHash: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireAdminPage();
  if (admin.role !== "super_admin") return { ok: false, message: "Only the super-admin can record payments." };
  try {
    // Poll server-side so the browser never calls a public RPC (avoids CORS
    // "Failed to fetch" after a successful OKX signature).
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await recordGiveawayPayment({ itemId, txHash });
        revalidatePath("/admin/treasury");
        revalidatePath("/admin/giveaways/payouts");
        return { ok: true, message: "Payment confirmed on BSC and marked paid." };
      } catch (error) {
        const message = error instanceof AppError ? error.userMessage : "";
        if (!/not confirmed|receipt|not found|transaction/i.test(message) || attempt === 9) throw error;
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    revalidatePath("/admin/treasury");
    revalidatePath("/admin/treasury");
    revalidatePath("/admin/giveaways/payouts");
    return { ok: true, message: "Payment confirmed on BSC and marked paid." };
  } catch (error) {
    return { ok: false, message: error instanceof AppError ? error.userMessage : "Payment verification failed." };
  }
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
