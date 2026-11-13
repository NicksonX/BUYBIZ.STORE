"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserPage } from "@/server/auth/guards";
import { formError, formSuccess, type ActionState } from "@/lib/validation/action-state";
import { setEmailOptIns, unsubscribeByToken } from "@/server/services/email";

export async function updateEmailPreferenceAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  const depositRemindersOptIn = formData.get("depositRemindersOptIn") === "on";
  const user = token ? null : await requireUserPage();
  const changed = await setEmailOptIns({
    token: token || undefined,
    userId: user?.id,
    marketingOptIn,
    depositRemindersOptIn,
  });
  if (!changed) return formError("This email preference link is invalid or expired.");
  revalidatePath("/dashboard/settings");
  revalidatePath("/email-preferences");
  return formSuccess(
    "Email preferences saved. Essential account emails are unaffected.",
  );
}

export async function unsubscribeEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/unsubscribe?status=invalid");
  const changed = await unsubscribeByToken(token);
  redirect(`/unsubscribe?status=${changed ? "done" : "invalid"}`);
}
