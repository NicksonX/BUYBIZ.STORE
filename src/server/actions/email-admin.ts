"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/server/auth/guards";
import { AppError, toUserMessage } from "@/lib/errors";
import { formError, formSuccess, type ActionState } from "@/lib/validation/action-state";
import { isEmailConfigured } from "@/lib/email/config";
import { EMAIL_TYPES } from "@/lib/email/templates";
import { queueEmail, processEmailQueue, retryEmailDelivery } from "@/server/services/email";
import { runDepositFollowupJobs } from "@/server/services/email-followups";

function emailLike(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updateEmailSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const senderName = String(formData.get("senderName") ?? "").trim();
  const senderEmail = String(formData.get("senderEmail") ?? "").trim();
  const supportEmail = String(formData.get("supportEmail") ?? "").trim();
  const followupRaw = String(formData.get("followupHours") ?? "24,72,168");
  const marketingEnabled = formData.get("marketingEnabled") === "on";
  if (senderName.length < 2 || senderName.length > 80) {
    return formError("Sender name must be between 2 and 80 characters.");
  }
  if (!emailLike(senderEmail) || !emailLike(supportEmail)) {
    return formError("Enter valid sender and support email addresses.");
  }
  const hours = followupRaw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 2160)
    .slice(0, 5);
  if (!hours.length) return formError("Add at least one follow-up time in hours.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    const values: Array<[string, unknown]> = [
      ["email_sender_name", senderName],
      ["email_sender_email", senderEmail],
      ["email_support_email", supportEmail],
      ["email_followup_hours", hours],
      ["email_marketing_enabled", marketingEnabled],
    ];
    for (const [key, value] of values) {
      await tx.query(
        `insert into app_settings (key,value,description)
         values ($1,$2::jsonb,'Updated from Email Management')
         on conflict (key) do update set value=excluded.value, updated_at=now()`,
        [key, JSON.stringify(value)],
      );
    }
  });
  revalidatePath("/admin/emails");
  return formSuccess("Email settings saved. Provider credentials still come from Render environment variables.");
}

export async function updateEmailTemplateAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const type = String(formData.get("type") ?? "");
  if (!EMAIL_TYPES.includes(type as (typeof EMAIL_TYPES)[number])) {
    return formError("Unknown email type.");
  }
  const subject = String(formData.get("subject") ?? "").trim();
  const preheader = String(formData.get("preheader") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim();
  const enabled = formData.get("enabled") === "on";
  if (subject.length < 3 || subject.length > 160) return formError("Enter a valid subject.");
  if (preheader.length > 240 || intro.length > 1200) {
    return formError("Keep the preheader under 240 and intro under 1200 characters.");
  }
  const db = await getDb();
  await db.query(
    `update email_templates
        set subject=$2, preheader=$3, intro=$4, enabled=$5, updated_at=now()
      where type=$1`,
    [type, subject, preheader, intro, enabled],
  );
  revalidatePath("/admin/emails");
  return formSuccess("Email template updated.");
}

export async function sendProviderTestAction(_previous: ActionState, _formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  if (!isEmailConfigured()) return formError("Resend is not configured. Add RESEND_API_KEY or EMAIL_API_KEY.");
  const db = await getDb();
  const user = await requireAdmin();
  const deliveryId = await db.transaction((tx) => queueEmail(tx, {
    type: "provider_test", userId: user.id, recipient: user.email,
    data: { name: user.displayName ?? user.username, preferencesUrl: "" },
    dedupeKey: `provider_test:${user.id}:${Date.now()}`,
  }));
  if (!deliveryId) return formError("Test email was not queued.");
  const result = await processEmailQueue({ ids: [deliveryId] });
  return result.sent
    ? formSuccess("Resend accepted the test email. Check the delivery log for the provider message ID.")
    : formError("Resend did not accept the test email. Check the delivery log.");
}

export async function retryEmailDeliveryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  if (!isEmailConfigured()) {
    return formError("Email provider is not configured. Add the Render environment variables first.");
  }
  const id = String(formData.get("deliveryId") ?? "");
  if (!id) return formError("Missing delivery.");
  const db = await getDb();
  const row = await db.query<{ emailType: string }>(
    `select email_type as "emailType" from email_deliveries where id=$1 limit 1`,
    [id],
  );
  if (row.rows[0]?.emailType === "signup_verification") {
    return formError(
      "Verification codes cannot be retried safely. Ask the customer to request a new code.",
    );
  }
  const retried = await retryEmailDelivery(id);
  if (!retried) return formError("Only failed or unconfigured emails can be retried.");
  const result = await processEmailQueue({ ids: [id] });
  revalidatePath("/admin/emails");
  return result.sent
    ? formSuccess("Email sent.")
    : formError("The retry failed. Check the delivery log for the provider response.");
}

export async function processEmailQueueAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  if (!isEmailConfigured()) {
    return formError("Email provider is not configured. Add EMAIL_API_KEY and EMAIL_FROM in Render.");
  }
  const result = await processEmailQueue({ limit: 200 });
  revalidatePath("/admin/emails");
  return formSuccess(
    `Queue processed: ${result.sent} sent, ${result.failed} failed, ${result.processed} checked.`,
  );
}

export async function runEmailFollowupsAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  const result = await runDepositFollowupJobs();
  revalidatePath("/admin/emails");
  return formSuccess(
    `Follow-up run complete: ${result.queued} queued, ${result.processed?.sent ?? 0} sent.${result.skipped ? ` ${result.skipped}` : ""}`,
  );
}

export async function sendEmailCampaignAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return formError(toUserMessage(error));
  }
  if (!isEmailConfigured()) {
    return formError("Email provider is not configured. The campaign was not sent.");
  }
  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (name.length < 3 || subject.length < 3 || message.length < 10) {
    return formError("Add a campaign name, subject and message.");
  }
  const db = await getDb();
  const marketing = await db.query<{ enabled: unknown }>(
    `select value as enabled from app_settings where key='email_marketing_enabled' limit 1`,
  );
  if (marketing.rows[0]?.enabled !== true) {
    return formError("Marketing email is disabled. Enable it before sending a campaign.");
  }
  const recipients = await db.query<{
    id: string;
    email: string;
    username: string;
  }>(
    `select p.id, p.email, p.username
       from profiles p
       join email_preferences e on e.user_id=p.id
      where p.role='customer' and p.status='active' and e.marketing_opt_in=true`,
  );
  if (!recipients.rows.length) {
    return formError("No customers have opted in to marketing email.");
  }
  const campaignId = (
    await db.query<{ id: string }>(
      `insert into email_campaigns (name,subject,message,status,audience,created_by)
       values ($1,$2,$3,'sending','marketing_opt_in',$4) returning id`,
      [name, subject, message, admin.id],
    )
  ).rows[0].id;
  for (const recipient of recipients.rows) {
    await db.transaction((tx) =>
      queueEmail(tx, {
        type: "marketing",
        userId: recipient.id,
        recipient: recipient.email,
        data: {
          name: recipient.username,
          campaignSubject: subject,
          campaignMessage: message,
        },
        dedupeKey: `campaign:${campaignId}:${recipient.id}`,
      }),
    );
  }
  const processed = await processEmailQueue({ limit: 50 });
  await db.query(
    `update email_campaigns
        set status=$2, sent_at=case when $2='sent' then now() else sent_at end
      where id=$1`,
    [
      campaignId,
      processed.failed === 0 && processed.processed >= recipients.rows.length
        ? "sent"
        : "sending",
    ],
  );
  revalidatePath("/admin/emails");
  return formSuccess(
    processed.failed === 0
      ? `Campaign sent to ${processed.sent} opted-in customers.`
      : `Campaign attempted for ${recipients.rows.length} customers. ${processed.sent} sent and ${processed.failed} failed; failed messages remain retryable in the delivery log.`,
  );
}
