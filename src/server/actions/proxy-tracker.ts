"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guards";
import { AppError, toUserMessage } from "@/lib/errors";
import { formError, formSuccess, type ActionState } from "@/lib/validation/action-state";
import { replaceExpiredProxy, toggleProxyFlag } from "@/server/services/proxy-tracker";

export async function flagProxyAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const allocationId = String(formData.get("allocationId") ?? "");
    const flagged = String(formData.get("flagged") ?? "") === "1";
    await toggleProxyFlag({ allocationId, adminId: admin.id, flagged, reason: String(formData.get("reason") ?? "") });
    revalidatePath("/admin/proxy-tracker");
    revalidatePath("/admin/allocations");
    return formSuccess(flagged ? "Allocation IP flagged for tracking." : "Allocation flag removed.");
  } catch (error) { return formError(toUserMessage(error)); }
}

export async function replaceProxyAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const allocationId = String(formData.get("allocationId") ?? "");
    const inventoryId = String(formData.get("inventoryId") ?? "");
    if (!inventoryId) throw new AppError("VALIDATION", "Choose a replacement proxy.");
    const result = await replaceExpiredProxy({ allocationId, inventoryId, adminId: admin.id, restoreAccess: formData.get("restoreAccess") === "1", reason: String(formData.get("reason") ?? "") });
    revalidatePath("/admin/proxy-tracker");
    revalidatePath("/admin/allocations");
    return formSuccess(result.restoreAccess ? `Proxy replaced with ${result.label}. Seven-day access restored.` : `Proxy replaced with ${result.label}. Expiry unchanged and access remains expired.`);
  } catch (error) { return formError(toUserMessage(error)); }
}
