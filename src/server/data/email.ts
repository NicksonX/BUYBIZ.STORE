import "server-only";
import { getDb } from "@/lib/db";
import { getEmailRuntimeStatus } from "@/lib/email/config";
import { emailPolicySummary } from "@/server/services/email-policy";

export async function getEmailAdminData() {
  const db = await getDb();
  const [settings, templates, deliveries, campaigns, counts] = await Promise.all([
    db.query<{ key: string; value: unknown }>(
      `select key, value from app_settings where key in (
        'email_sender_name','email_sender_email','email_support_email',
        'email_followup_hours','email_marketing_enabled',
        'email_otp_ttl_minutes','email_otp_resend_seconds'
      )`,
    ),
    db.query<{
      type: string;
      subject: string;
      preheader: string;
      intro: string;
      enabled: boolean;
      updatedAt: Date;
    }>(
      `select type, subject, preheader, intro, enabled, updated_at as "updatedAt"
         from email_templates order by type`,
    ),
    db.query<{
      id: string;
      recipient: string;
      emailType: string;
      subject: string;
      status: string;
      attempts: number;
      lastError: string | null;
      createdAt: Date;
      sentAt: Date | null;
      username: string | null;
    }>(
      `select d.id, d.recipient, d.email_type as "emailType", d.subject,
              d.status, d.attempts, d.last_error as "lastError",
              d.created_at as "createdAt", d.sent_at as "sentAt",
              p.username
         from email_deliveries d
         left join profiles p on p.id=d.user_id
        order by d.created_at desc limit 120`,
    ),
    db.query<{
      id: string;
      name: string;
      subject: string;
      status: string;
      audience: string;
      sentAt: Date | null;
      createdAt: Date;
    }>(
      `select id, name, subject, status, audience,
              sent_at as "sentAt", created_at as "createdAt"
         from email_campaigns order by created_at desc limit 30`,
    ),
    db.query<{
      queued: number;
      sent: number;
      failed: number;
      notConfigured: number;
      disabled: number;
    }>(
      `select
         count(*) filter (where status='queued')::int as queued,
         count(*) filter (where status='sent')::int as sent,
         count(*) filter (where status='failed')::int as failed,
         count(*) filter (where status='not_configured')::int as "notConfigured",
         count(*) filter (where status='disabled')::int as disabled
       from email_deliveries`,
    ),
  ]);
  const map = new Map(settings.rows.map((row) => [row.key, row.value]));
  return {
    runtime: getEmailRuntimeStatus(),
    settings: {
      senderName: String(map.get("email_sender_name") ?? "BUYBIZ"),
      senderEmail: String(map.get("email_sender_email") ?? ""),
      supportEmail: String(map.get("email_support_email") ?? ""),
      followupHours: Array.isArray(map.get("email_followup_hours"))
        ? (map.get("email_followup_hours") as number[])
        : [24, 72, 168],
      marketingEnabled: map.get("email_marketing_enabled") === true,
      otpTtlMinutes: Number(map.get("email_otp_ttl_minutes") ?? 10),
      otpResendSeconds: Number(map.get("email_otp_resend_seconds") ?? 60),
    },
    templates: templates.rows,
    deliveries: deliveries.rows,
    campaigns: campaigns.rows,
    counts: {
      queued: Number(counts.rows[0]?.queued ?? 0),
      sent: Number(counts.rows[0]?.sent ?? 0),
      failed: Number(counts.rows[0]?.failed ?? 0),
      notConfigured: Number(counts.rows[0]?.notConfigured ?? 0),
      disabled: Number(counts.rows[0]?.disabled ?? 0),
    },
    policy: emailPolicySummary(),
  };
}

export async function getEmailPreferenceByToken(token: string) {
  const db = await getDb();
  const result = await db.query<{
    userId: string;
    marketingOptIn: boolean;
    depositRemindersOptIn: boolean;
    username: string;
    email: string;
  }>(
    `select p.id as "userId", e.marketing_opt_in as "marketingOptIn",
            e.deposit_reminders_opt_in as "depositRemindersOptIn",
            p.username, p.email
       from email_preferences e join profiles p on p.id=e.user_id
      where e.unsubscribe_token=$1 limit 1`,
    [token],
  );
  return result.rows[0] ?? null;
}
