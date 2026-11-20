import "server-only";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import { getAppUrl } from "@/lib/config";
import {
  getEmailFromAddress,
  getEmailRuntimeStatus,
} from "@/lib/email/config";
import { sendEmailViaProvider, type ProviderSendResult } from "@/lib/email/client";
import { recordProviderAttempt, selectEmailProviders } from "@/server/services/email-providers";
import { getEmailPolicy, isEmailAllowed } from "@/server/services/email-policy";
import type { EmailProvider } from "@/lib/email/config";
import {
  DEFAULT_TEMPLATES,
  EMAIL_TYPES,
  renderEmail,
  type EmailTemplateData,
  type EmailTemplateOverride,
  type EmailType,
} from "@/lib/email/templates";

export type EmailContext = {
  senderName: string;
  senderEmail: string;
  supportEmail: string;
  websiteUrl: string;
};

export type QueueEmailInput = {
  type: EmailType;
  userId?: string | null;
  recipient: string;
  data?: EmailTemplateData;
  dedupeKey: string;
  scheduledAt?: Date;
};

function isMarketingType(type: EmailType) {
  return type === "marketing";
}

function isLifecycleEmail(type: EmailType) {
  return type === "deposit_followup";
}

function safeError(error: string | undefined | null) {
  return String(error ?? "Unknown email error").slice(0, 500);
}

async function context(tx?: SqlTransaction): Promise<EmailContext> {
  const db = tx ?? (await getDb());
  const result = await db.query<{ key: string; value: unknown }>(
    `select key, value from app_settings
      where key in ('email_sender_name','email_sender_email','email_support_email')`,
  );
  const map = new Map(result.rows.map((row) => [row.key, row.value]));
  const support =
    String(map.get("email_support_email") ?? "").trim() ||
    process.env.EMAIL_SUPPORT_EMAIL?.trim() ||
    process.env.OFFICIAL_SUPPORT_EMAIL?.trim() ||
    "support@buybiz.store";
  return {
    senderName: String(map.get("email_sender_name") ?? "BUYBIZ").trim() || "BUYBIZ",
    senderEmail:
      String(map.get("email_sender_email") ?? "").trim() ||
      getEmailFromAddress(),
    supportEmail: support,
    websiteUrl: getAppUrl(),
  };
}

export async function getEmailContext() {
  return context();
}

async function templateOverride(
  type: EmailType,
  tx?: SqlTransaction,
): Promise<{ template: EmailTemplateOverride; enabled: boolean }> {
  const db = tx ?? (await getDb());
  const result = await db.query<{
    subject: string;
    preheader: string;
    intro: string;
    enabled: boolean;
  }>(
    `select subject, preheader, intro, enabled from email_templates where type=$1 limit 1`,
    [type],
  );
  const row = result.rows[0];
  return {
    template: row ?? DEFAULT_TEMPLATES[type],
    enabled: row?.enabled ?? true,
  };
}

async function preferenceData(
  userId: string | null | undefined,
  type: EmailType,
  db: SqlTransaction,
): Promise<{
  marketingOptIn: boolean;
  depositRemindersOptIn: boolean;
  token: string | null;
}> {
  if (!userId) {
    return { marketingOptIn: false, depositRemindersOptIn: true, token: null };
  }
  const result = await db.query<{
    marketingOptIn: boolean;
    depositRemindersOptIn: boolean;
    token: string;
  }>(
    `select marketing_opt_in as "marketingOptIn",
            deposit_reminders_opt_in as "depositRemindersOptIn",
            unsubscribe_token as token
       from email_preferences where user_id=$1 limit 1`,
    [userId],
  );
  return {
    marketingOptIn: Boolean(result.rows[0]?.marketingOptIn),
    depositRemindersOptIn: result.rows[0]?.depositRemindersOptIn !== false,
    token: result.rows[0]?.token ?? null,
  };
}

export async function queueEmail(
  tx: SqlTransaction,
  input: QueueEmailInput,
) {
  const email = input.recipient.trim().toLowerCase();
  if (!email.includes("@")) return null;
  if (!isEmailAllowed(input.type)) {
    // Policy suppression is deliberate and takes precedence over provider
    // availability. The in-app notification is the primary channel.
    return null;
  }
  const [ctx, template] = await Promise.all([
    context(tx),
    templateOverride(input.type, tx),
  ]);
  const prefs = await preferenceData(input.userId, input.type, tx);
  const marketing = isMarketingType(input.type);
  const data: EmailTemplateData = {
    ...input.data,
    preferencesUrl: prefs.token
      ? `${ctx.websiteUrl}/email-preferences?token=${encodeURIComponent(prefs.token)}`
      : `${ctx.websiteUrl}/email-preferences`,
    unsubscribeUrl:
      marketing && prefs.token
        ? `${ctx.websiteUrl}/unsubscribe?token=${encodeURIComponent(prefs.token)}`
        : undefined,
  };
  const effectiveTemplate =
    input.type === "marketing" && data.campaignSubject
      ? { ...template.template, subject: data.campaignSubject }
      : template.template;
  const rendered = renderEmail({
    type: input.type,
    data,
    template: effectiveTemplate,
    websiteUrl: ctx.websiteUrl,
    supportEmail: ctx.supportEmail,
    preferencesUrl: data.preferencesUrl,
    unsubscribeUrl: data.unsubscribeUrl,
  });
  const allowed =
    template.enabled &&
    (!isMarketingType(input.type) || prefs.marketingOptIn) &&
    (!isLifecycleEmail(input.type) || prefs.depositRemindersOptIn);
  const status = allowed ? "queued" : "disabled";
  const result = await tx.query<{ id: string }>(
    `insert into email_deliveries
       (user_id, recipient, email_type, dedupe_key, subject, payload, status,
        scheduled_at, last_error)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
     on conflict (dedupe_key) do nothing
     returning id`,
    [
      input.userId ?? null,
      email,
      input.type,
      input.dedupeKey.slice(0, 200),
      rendered.subject,
      JSON.stringify(data),
      status,
      input.scheduledAt ?? new Date(),
      allowed
        ? null
        : !template.enabled
          ? "Email type disabled by administrator."
          : isLifecycleEmail(input.type)
            ? "Recipient has opted out of deposit reminder email."
            : "Recipient has not opted in to marketing email.",
    ],
  );
  return result.rows[0]?.id ?? null;
}

async function sendDeliveryRow(row: {
  id: string;
  recipient: string;
  email_type: string;
  subject: string;
  payload: EmailTemplateData;
  user_id: string | null;
}, providers: EmailProvider[]) {
  const type = row.email_type as EmailType;
  if (!EMAIL_TYPES.includes(type)) {
    return { ok: false as const, error: "Unknown email type." };
  }
  if (!isEmailAllowed(type)) {
    return { ok: false as const, error: "Suppressed by central email policy." };
  }
  const db = await getDb();
  const [ctx, template, prefs] = await Promise.all([
    context(),
    templateOverride(type),
    preferenceData(row.user_id, type, db),
  ]);
  if (!template.enabled) {
    return { ok: false as const, error: "Email type disabled." };
  }
  if (isMarketingType(type) && !prefs.marketingOptIn) {
    return { ok: false as const, error: "Recipient opted out of marketing email." };
  }
  if (isLifecycleEmail(type) && !prefs.depositRemindersOptIn) {
    return { ok: false as const, error: "Recipient opted out of deposit reminder email." };
  }
  const data: EmailTemplateData = {
    ...row.payload,
    preferencesUrl: prefs.token
      ? `${ctx.websiteUrl}/email-preferences?token=${encodeURIComponent(prefs.token)}`
      : `${ctx.websiteUrl}/email-preferences`,
    unsubscribeUrl:
      isMarketingType(type) && prefs.token
        ? `${ctx.websiteUrl}/unsubscribe?token=${encodeURIComponent(prefs.token)}`
        : undefined,
  };
  const effectiveTemplate =
    type === "marketing" && data.campaignSubject
      ? { ...template.template, subject: data.campaignSubject }
      : template.template;
  const rendered = renderEmail({
    type,
    data,
    template: effectiveTemplate,
    websiteUrl: ctx.websiteUrl,
    supportEmail: ctx.supportEmail,
    preferencesUrl: data.preferencesUrl,
    unsubscribeUrl: data.unsubscribeUrl,
  });
  if (providers.length === 0) {
    return { ok: false as const, error: "Both email providers are unavailable." };
  }
  let last: ProviderSendResult | null = null;
  for (const provider of providers) {
    const result = await sendEmailViaProvider(
      {
        to: row.recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        replyTo: ctx.supportEmail,
        fromName: ctx.senderName,
        fromAddress: ctx.senderEmail,
      },
      provider,
    );
    last = result;
    await db.transaction(async (tx) => {
      await recordProviderAttempt(tx, {
        deliveryId: row.id,
        provider,
        status: result.ok
          ? "accepted"
          : result.uncertain
            ? "uncertain"
            : "rejected",
        providerMessageId: result.ok ? result.providerMessageId : null,
        httpStatus: result.ok ? null : result.statusCode ?? null,
        errorCategory: result.ok
          ? null
          : result.uncertain
            ? "uncertain"
            : "provider_rejected",
        errorMessage: result.ok ? null : result.error,
      });
    });
    if (result.ok) return result;
    // Do not risk duplicate delivery after an uncertain outcome.
    if (result.uncertain) return result;
  }
  return last ?? { ok: false as const, error: "No eligible email provider." };
}

/**
 * Claims and sends queued emails. Safe to call repeatedly. A provider outage
 * leaves the row failed with a retryable status for the admin screen.
 */
export async function processEmailQueue(options?: {
  limit?: number;
  ids?: string[];
}) {
  const db = await getDb();
  // A worker that crashed between claiming and finishing leaves a stale
  // 'sending' row. Make it retryable instead of silently losing the email.
  await db.query(
    `update email_deliveries
        set status='failed', last_error='Email worker stopped before completion.',
            updated_at=now()
      where status='sending' and updated_at < now() - interval '10 minutes'`,
  );
  const runtime = getEmailRuntimeStatus();
  if (!runtime.configured) {
    await db.query(
      `update email_deliveries
          set status='not_configured',
              last_error='Email provider is not configured.',
              updated_at=now()
        where status='queued' and scheduled_at <= now()`,
    );
    return { processed: 0, sent: 0, failed: 0, configured: false };
  }

  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 200);
  const ids = options?.ids?.length
    ? options.ids.slice(0, 200)
    : (
        await db.query<{ id: string }>(
          `select id from email_deliveries
            where status='queued' and scheduled_at <= now()
            order by scheduled_at asc
            limit $1`,
          [limit],
        )
      ).rows.map((row) => row.id);
  let sent = 0;
  let failed = 0;
  for (const id of ids) {
    const claim = await db.transaction(async (tx) => {
      const claimed = await tx.query<{
        id: string;
        recipient: string;
        email_type: string;
        subject: string;
        payload: EmailTemplateData;
        user_id: string | null;
        attempts: number;
      }>(
        `update email_deliveries
            set status='sending', attempts=attempts+1, updated_at=now()
          where id=$1 and status='queued' and scheduled_at <= now()
          returning id, recipient, email_type, subject, payload, user_id, attempts`,
        [id],
      );
      const row = claimed.rows[0];
      if (!row) return null;
      const providers = await selectEmailProviders(tx, row.id);
      return { row, providers };
    });
    if (!claim) continue;
    const { row, providers } = claim;
    if (!isEmailAllowed((row as { email_type?: string }).email_type as EmailType)) {
      await db.query(
        `update email_deliveries
            set status='disabled', provider_status='skipped', provider=null,
                last_error=$2, updated_at=now()
          where id=$1`,
        [row.id, "Suppressed by central email policy; use in-app notifications."],
      );
      continue;
    }
    if (providers.length === 0) {
      await db.query(
        `update email_deliveries
            set status='queued', scheduled_at=now() + interval '5 minutes',
                last_error='Both email providers are unavailable. Retry scheduled.',
                updated_at=now()
          where id=$1`,
        [row.id],
      );
      failed += 1;
      continue;
    }
    try {
      const result = await sendDeliveryRow(row, providers);
      if (result.ok) {
        await db.query(
          `update email_deliveries
              set status='sent', sent_at=now(), provider_message_id=$2,
                  provider=$3, provider_status='accepted', provider_accepted_at=now(),
                  fallback_used=$4, last_error=null, updated_at=now()
            where id=$1`,
          [row.id, result.providerMessageId, result.provider, providers[0] !== result.provider],
        );
        sent += 1;
      } else {
        const uncertain = "uncertain" in result && result.uncertain;
        const retryDelay = Math.min(3600, 60 * 2 ** Math.min(Number(row.attempts ?? 1), 6));
        await db.query(
          `update email_deliveries
              set status=$3, scheduled_at=now() + ($4::int * interval '1 second'),
                  last_error=$2, provider_status=$5, updated_at=now()
            where id=$1`,
          [
            row.id,
            safeError(result.error),
            uncertain ? "queued" : "failed",
            uncertain ? retryDelay : 0,
            uncertain ? "uncertain" : "rejected",
          ],
        );
        failed += 1;
      }
    } catch (error) {
      await db.query(
        `update email_deliveries
            set status='queued', scheduled_at=now() + interval '10 minutes',
                last_error=$2, provider_status='uncertain', updated_at=now()
          where id=$1`,
        [row.id, safeError(error instanceof Error ? error.message : String(error))],
      );
      failed += 1;
    }
  }
  return { processed: ids.length, sent, failed, configured: true };
}

export async function retryEmailDelivery(id: string) {
  const db = await getDb();
  const result = await db.query(
    `update email_deliveries
        set status='queued', scheduled_at=now(), last_error=null, updated_at=now()
      where id=$1 and status in ('failed','not_configured')
      returning id`,
    [id],
  );
  return Boolean(result.rows[0]);
}

export async function flushEmailQueue(limit = 10) {
  try {
    return await processEmailQueue({ limit });
  } catch (error) {
    console.error(
      "[buybiz/email] queue flush failed",
      error instanceof Error ? error.message : error,
    );
    return { processed: 0, sent: 0, failed: 0, configured: false };
  }
}

/**
 * OTPs are sent immediately because retrying an old code is unsafe. The OTP
 * itself is never stored in the delivery log or audit trail.
 */
export async function sendOtpEmail(input: {
  userId: string;
  email: string;
  name: string;
  code: string;
  expiresMinutes: number;
  otpId: string;
}) {
  const db = await getDb();
  const [ctx, template] = await Promise.all([context(), templateOverride("signup_verification")]);
  if (!template.enabled) {
    return { ok: false as const, error: "Signup verification email is disabled by the administrator." };
  }
  const rendered = renderEmail({
    type: "signup_verification",
    data: {
      name: input.name,
      code: input.code,
      expiresMinutes: input.expiresMinutes,
      preferencesUrl: `${ctx.websiteUrl}/email-preferences`,
    },
    template: template.template,
    websiteUrl: ctx.websiteUrl,
    supportEmail: ctx.supportEmail,
    preferencesUrl: `${ctx.websiteUrl}/email-preferences`,
  });
  const exists = await db.query<{ id: string }>(
    `select id from email_deliveries where dedupe_key=$1 limit 1`,
    [`otp:${input.otpId}`],
  );
  let deliveryId = exists.rows[0]?.id;
  if (!deliveryId) {
    const inserted = await db.query<{ id: string }>(
      `insert into email_deliveries
         (user_id, recipient, email_type, dedupe_key, subject, payload, status,
          attempts, last_error)
       values ($1,$2,'signup_verification',$3,$4,$5::jsonb,'sending',1,null)
       returning id`,
      [
        input.userId,
        input.email,
        `otp:${input.otpId}`,
        rendered.subject,
        JSON.stringify({ name: input.name, expiresMinutes: input.expiresMinutes }),
      ],
    );
    deliveryId = inserted.rows[0]?.id;
  }
  const providers = deliveryId
    ? await db.transaction((tx) => selectEmailProviders(tx, deliveryId))
    : [];
  let result: ProviderSendResult = { ok: false, provider: "resend", error: "No eligible email provider." };
  for (const provider of providers) {
    result = await sendEmailViaProvider(
      {
        to: input.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        replyTo: ctx.supportEmail,
        fromName: ctx.senderName,
        fromAddress: ctx.senderEmail,
      },
      provider,
    );
    if (deliveryId) {
      await db.transaction(async (tx) => {
        await recordProviderAttempt(tx, {
          deliveryId,
          provider,
          status: result.ok ? "accepted" : result.uncertain ? "uncertain" : "rejected",
          providerMessageId: result.ok ? result.providerMessageId : null,
          httpStatus: result.ok ? null : result.statusCode ?? null,
          errorCategory: result.ok ? null : result.uncertain ? "uncertain" : "provider_rejected",
          errorMessage: result.ok ? null : result.error,
        });
      });
    }
    if (result.ok || result.uncertain) break;
  }
  if (deliveryId) {
    await db.query(
      `update email_deliveries
          set status=$2, provider=$5, provider_status=$6, provider_message_id=$3, last_error=$4,
              provider_accepted_at=case when $2='sent' then now() else null end,
              sent_at=case when $2='sent' then now() else sent_at end,
              updated_at=now()
        where id=$1`,
      [
        deliveryId,
        result.ok ? "sent" : getEmailRuntimeStatus().configured ? "failed" : "not_configured",
        result.ok ? result.providerMessageId : null,
        result.ok ? null : safeError(result.error),
        result.ok ? result.provider : providers[0] ?? null,
        result.ok ? "accepted" : result.uncertain ? "uncertain" : "rejected",
      ],
    );
  }
  return result;
}

export async function getEmailPreferences(userId: string) {
  const db = await getDb();
  let result = await db.query<{
    marketingOptIn: boolean;
    depositRemindersOptIn: boolean;
    token: string;
  }>(
    `select marketing_opt_in as "marketingOptIn",
            deposit_reminders_opt_in as "depositRemindersOptIn",
            unsubscribe_token as token
       from email_preferences where user_id=$1 limit 1`,
    [userId],
  );
  if (!result.rows[0]) {
    const inserted = await db.query<{
      marketingOptIn: boolean;
      depositRemindersOptIn: boolean;
      token: string;
    }>(
      `insert into email_preferences
         (user_id, marketing_opt_in, deposit_reminders_opt_in, unsubscribe_token)
       values ($1,false,true,replace(gen_random_uuid()::text,'-',''))
       on conflict (user_id) do update set updated_at=now()
       returning marketing_opt_in as "marketingOptIn",
                 deposit_reminders_opt_in as "depositRemindersOptIn",
                 unsubscribe_token as token`,
      [userId],
    );
    result = inserted;
  }
  return result.rows[0];
}

export async function setEmailOptIns(input: {
  userId?: string;
  token?: string;
  marketingOptIn: boolean;
  depositRemindersOptIn: boolean;
}) {
  const db = await getDb();
  if (input.token) {
    const result = await db.query<{ userId: string }>(
      `update email_preferences
          set marketing_opt_in=$2, deposit_reminders_opt_in=$3, updated_at=now()
        where unsubscribe_token=$1 returning user_id as "userId"`,
      [input.token, input.marketingOptIn, input.depositRemindersOptIn],
    );
    return result.rows[0]?.userId ?? null;
  }
  if (!input.userId) return null;
  await db.query(
    `insert into email_preferences
       (user_id, marketing_opt_in, deposit_reminders_opt_in, unsubscribe_token)
     values ($1,$2,$3,replace(gen_random_uuid()::text,'-',''))
     on conflict (user_id) do update
       set marketing_opt_in=$2, deposit_reminders_opt_in=$3, updated_at=now()`,
    [input.userId, input.marketingOptIn, input.depositRemindersOptIn],
  );
  return input.userId;
}

export async function setMarketingOptIn(userId: string, optIn: boolean) {
  const db = await getDb();
  await db.query(
    `insert into email_preferences (user_id, marketing_opt_in, unsubscribe_token)
     values ($1,$2,replace(gen_random_uuid()::text,'-',''))
     on conflict (user_id) do update set marketing_opt_in=$2, updated_at=now()`,
    [userId, optIn],
  );
}

export async function unsubscribeByToken(token: string) {
  const db = await getDb();
  const result = await db.query<{ userId: string }>(
    `update email_preferences
        set marketing_opt_in=false, deposit_reminders_opt_in=false, updated_at=now()
      where unsubscribe_token=$1
      returning user_id as "userId"`,
    [token],
  );
  return result.rows[0]?.userId ?? null;
}

export async function queueWelcomeEmail(userId: string, dedupeKey = `welcome:${userId}`) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const profile = await tx.query<{ email: string; username: string; displayName: string | null }>(
      `select email, username, display_name as "displayName" from profiles where id=$1 limit 1`,
      [userId],
    );
    const row = profile.rows[0];
    if (!row) return null;
    const id = await queueEmail(tx, {
      type: "welcome",
      userId,
      recipient: row.email,
      data: { name: row.displayName || row.username },
      dedupeKey,
    });
    return id;
  });
}

export async function queueDepositFollowup(
  tx: SqlTransaction,
  input: { userId: string; email: string; name: string; stage: number; hours: number },
) {
  return queueEmail(tx, {
    type: "deposit_followup",
    userId: input.userId,
    recipient: input.email,
    data: { name: input.name },
    dedupeKey: `deposit_followup:${input.stage}:${input.userId}`,
    scheduledAt: new Date(Date.now() + input.hours * 3_600_000),
  });
}

export async function getFollowupHours() {
  const db = await getDb();
  const result = await db.query<{ value: unknown }>(
    `select value from app_settings where key='email_followup_hours' limit 1`,
  );
  const raw = result.rows[0]?.value;
  if (Array.isArray(raw)) {
    return raw
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 1 && value <= 2160)
      .slice(0, 5);
  }
  return [24, 72, 168];
}
