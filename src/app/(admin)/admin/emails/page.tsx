import { AlertTriangle, CheckCircle2, Mail, RefreshCw, Send, ServerCog, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Textarea } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdminPage } from "@/server/auth/guards";
import { getEmailAdminData } from "@/server/data/email";
import { getDb } from "@/lib/db";
import { getGiveawayAnnouncementStats } from "@/server/services/giveaways";
import {
  processEmailQueueAction,
  retryEmailDeliveryAction,
  sendProviderTestAction,
  runEmailFollowupsAction,
  sendEmailCampaignAction,
  updateEmailSettingsAction,
  updateEmailTemplateAction,
} from "@/server/actions/email-admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminEmailsPage() {
  await requireAdminPage();
  const data = await getEmailAdminData();
  const db = await getDb();
  const activeGiveaway = (await db.query<{ id: string; title: string }>(`select id,title from giveaways where status='active' order by created_at desc limit 1`)).rows[0];
  const giveawayStats = activeGiveaway ? await getGiveawayAnnouncementStats(activeGiveaway.id) : null;
  const emailReady = data.runtime.apiKeyPresent && Boolean(data.settings.senderEmail || data.runtime.fromAddress);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="System"
        title="Email management"
        description="HTTPS transactional email for BUYBIZ. No SMTP ports are used, so this is compatible with Render's free web services."
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminActionForm action={processEmailQueueAction} submitLabel="Process queue" pendingLabel="Sending…" variant="outline" compact />
            <AdminActionForm action={sendProviderTestAction} submitLabel="Send Resend test" pendingLabel="Testing…" variant="subtle" compact />
            <AdminActionForm action={runEmailFollowupsAction} submitLabel="Run deposit follow-ups" pendingLabel="Running…" variant="subtle" compact />
          </div>
        }
      />

      <div className={`rounded-[11px] border px-4 py-3 ${emailReady ? "border-success/20 bg-success-soft" : "border-warning/25 bg-warning-soft"}`}>
        <div className="flex items-start gap-2">
          {emailReady ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />}
          <div>
            <p className={`text-[11px] font-semibold ${emailReady ? "text-success" : "text-warning"}`}>
              {emailReady ? "Email provider connected" : data.runtime.apiKeyPresent ? "Sender address missing" : "Email provider not configured"}
            </p>
            <p className="mt-1 text-[9.5px] leading-4 text-muted-foreground">
              {emailReady
                ? `${data.runtime.providerLabel} · sender ${data.settings.senderEmail || data.runtime.fromAddress} · no SMTP.`
                : data.runtime.apiKeyPresent
                  ? "The API key is present. Add a verified sender email in the settings below or set EMAIL_FROM in Render. Nothing is marked as sent while the sender is missing."
                  : "Add EMAIL_PROVIDER, EMAIL_API_KEY and EMAIL_FROM in Render, then redeploy. OTP, welcome and all transactional emails remain unavailable until then. Nothing is marked as sent while unconfigured."}
            </p>
          </div>
        </div>
      </div>

      {giveawayStats ? <section className="surface-card rounded-[13px] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[12px] font-semibold">Active giveaway announcement</h2><p className="mt-0.5 text-[9px] text-muted-foreground">{activeGiveaway?.title} · scoped campaign counts, not all BUYBIZ email.</p></div><Badge tone={giveawayStats.statuses.failed ? "warning" : "success"}>{giveawayStats.total} tracked</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{["sent", "queued", "sending", "failed"].map((status) => <div key={status} className="rounded-[8px] bg-surface-subtle p-2"><p className="text-[8px] capitalize text-muted-foreground">{status === "sent" ? "Accepted by provider" : status}</p><p className="tabular mt-1 text-[15px] font-semibold">{giveawayStats.statuses[status as keyof typeof giveawayStats.statuses] ?? 0}</p></div>)}</div></section> : null}
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Queued" value={data.counts.queued} icon={Mail} hint="Waiting for the worker" />
        <StatCard label="Sent" value={data.counts.sent} icon={CheckCircle2} hint="Provider accepted" />
        <StatCard label="Failed" value={data.counts.failed} icon={AlertTriangle} hint="Retryable" />
        <StatCard label="Not configured" value={data.counts.notConfigured} icon={ServerCog} hint="No provider at send time" />
        <StatCard label="Suppressed by policy" value={data.counts.disabled} icon={ShieldCheck} hint="Moved in-app; kept for audit" />
      </div>

      <section className="surface-card rounded-[13px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-[12px] font-semibold">Central email policy</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Resend is primary. Brevo is disabled. Routine activity is delivered in-app unless an administrator changes this policy in code.</p></div><Badge tone="success">Resend only</Badge></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-[8px] border border-border bg-surface-subtle p-2.5"><p className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">Essential email</p><p className="mt-1 text-[10px] font-medium">{data.policy.essential.length} event types</p><p className="mt-1 text-[8px] leading-4 text-muted-foreground">Security, receipts, confirmed payouts and proxy expiry.</p></div>
          <div className="rounded-[8px] border border-border bg-surface-subtle p-2.5"><p className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">In-app only</p><p className="mt-1 text-[10px] font-medium">{data.policy.inAppOnly.length} event types</p><p className="mt-1 text-[8px] leading-4 text-muted-foreground">Referral, ambassador, campaign and giveaway updates.</p></div>
          <div className="rounded-[8px] border border-border bg-surface-subtle p-2.5"><p className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">Marketing</p><p className="mt-1 text-[10px] font-medium">{data.policy.marketing.length} event type</p><p className="mt-1 text-[8px] leading-4 text-muted-foreground">Suppressed under the conservative policy.</p></div>
        </div>
      </section>

      <section className="surface-card rounded-[13px] p-4">
        <h2 className="text-[12px] font-semibold">Sender and follow-up settings</h2>
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          Provider credentials are stored only in Render environment variables. Sender identity and marketing consent settings are stored in the database.
        </p>
        <div className="mt-3">
          <AdminActionForm action={updateEmailSettingsAction} submitLabel="Save email settings" pendingLabel="Saving…">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Sender name" htmlFor="sender-name">
                <Input id="sender-name" name="senderName" defaultValue={data.settings.senderName} required maxLength={80} />
              </AdminField>
              <AdminField label="Sender email" htmlFor="sender-email" hint="Must be a verified provider sender.">
                <Input id="sender-email" name="senderEmail" type="email" defaultValue={data.settings.senderEmail} placeholder="hello@buybiz.store" />
              </AdminField>
              <AdminField label="Customer support email" htmlFor="support-email">
                <Input id="support-email" name="supportEmail" type="email" defaultValue={data.settings.supportEmail} placeholder="support@buybiz.store" />
              </AdminField>
              <AdminField label="Deposit follow-up hours" htmlFor="followup-hours" hint="Comma-separated, up to five values.">
                <Input id="followup-hours" name="followupHours" defaultValue={data.settings.followupHours.join(", ")} />
              </AdminField>
            </div>
            <label className="mt-3 flex items-start gap-2 text-[9.5px] leading-4 text-muted-foreground">
              <input type="checkbox" name="marketingEnabled" defaultChecked={data.settings.marketingEnabled} className="mt-0.5 h-3.5 w-3.5 accent-foreground" />
              Enable optional marketing campaigns for customers who explicitly opt in. Transactional emails are separate.
            </label>
            <AdminNote tone="info">
              The provider API key is never entered or displayed here. Set <code>EMAIL_API_KEY</code> and <code>EMAIL_FROM</code> in Render. No SMTP configuration is required.
            </AdminNote>
          </AdminActionForm>
        </div>
      </section>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Email templates</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Subjects and intros are editable. OTP codes, amounts and other sensitive values are inserted at send time and are never stored in the template or delivery log.
          </p>
        </div>
        <div className="divide-y divide-border">
          {data.templates.map((template) => (
            <details key={template.type} className="px-4 py-3">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <div>
                  <p className="text-[10.5px] font-medium">{label(template.type)}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{template.subject}</p>
                </div>
                <Badge tone={template.enabled ? "success" : "neutral"}>{template.enabled ? "Enabled" : "Disabled"}</Badge>
              </summary>
              <div className="mt-3">
                <AdminActionForm action={updateEmailTemplateAction} hidden={{ type: template.type }} submitLabel="Save template" pendingLabel="Saving…" variant="outline" compact>
                  <div className="grid gap-2.5">
                    <AdminField label="Subject" htmlFor={`subject-${template.type}`}>
                      <Input id={`subject-${template.type}`} name="subject" defaultValue={template.subject} required maxLength={160} />
                    </AdminField>
                    <AdminField label="Preheader" htmlFor={`preheader-${template.type}`}>
                      <Input id={`preheader-${template.type}`} name="preheader" defaultValue={template.preheader} maxLength={240} />
                    </AdminField>
                    <AdminField label="Introduction copy" htmlFor={`intro-${template.type}`}>
                      <Textarea id={`intro-${template.type}`} name="intro" defaultValue={template.intro} maxLength={1200} className="min-h-20 text-[10px]" />
                    </AdminField>
                    <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      <input type="checkbox" name="enabled" defaultChecked={template.enabled} className="h-3.5 w-3.5 accent-foreground" />
                      Enable this automated email
                    </label>
                  </div>
                </AdminActionForm>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-[13px] p-4">
        <h2 className="flex items-center gap-1.5 text-[12px] font-semibold"><Send className="h-3.5 w-3.5" /> Promotional campaign</h2>
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          Only customers who opted in receive marketing. Never advertise a bonus that is not configured and approved.
        </p>
        <div className="mt-3">
          <AdminActionForm action={sendEmailCampaignAction} submitLabel="Send campaign" pendingLabel="Sending…">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Campaign name" htmlFor="campaign-name"><Input id="campaign-name" name="name" required maxLength={100} placeholder="October proxy offer" /></AdminField>
              <AdminField label="Subject" htmlFor="campaign-subject"><Input id="campaign-subject" name="subject" required maxLength={160} placeholder="A small BUYBIZ update" /></AdminField>
            </div>
            <AdminField label="Message" htmlFor="campaign-message">
              <Textarea id="campaign-message" name="message" required maxLength={1000} className="min-h-28 text-[10px]" placeholder="Write a short, honest message. Only include offers that are actually configured." />
            </AdminField>
            <AdminNote tone="warning">This sends immediately to opted-in customers. Test your provider domain before sending a large campaign.</AdminNote>
          </AdminActionForm>
        </div>
        {data.campaigns.length ? (
          <div className="mt-3 space-y-1.5">
            {data.campaigns.map((campaign) => (
              <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[7px] border border-border px-2.5 py-2 text-[9px]">
                <span className="font-medium">{campaign.name}</span>
                <span className="text-muted-foreground">{campaign.subject}</span>
                <Badge tone={campaign.status === "sent" ? "success" : "neutral"}>{campaign.status}</Badge>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-[12px] font-semibold">Delivery log</h2>
            <p className="mt-0.5 text-[9px] text-muted-foreground">OTP codes are never logged. Provider failures are retained for safe retry.</p>
          </div>
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        {data.deliveries.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No email activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="border-b border-border bg-surface-subtle/60">
                <tr>{["Recipient", "Type", "Status", "Attempts", "Created", "Action"].map((heading) => <th key={heading} className="px-3 py-2 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-3 py-2 text-[9px]">{delivery.recipient}{delivery.username ? <p className="text-[8px] text-muted-foreground">@{delivery.username}</p> : null}</td>
                    <td className="px-3 py-2 text-[8.5px]">{label(delivery.emailType)}<p className="max-w-[240px] truncate text-[8px] text-muted-foreground">{delivery.subject}</p></td>
                    <td className="px-3 py-2"><Badge tone={delivery.status === "sent" ? "success" : delivery.status === "failed" ? "danger" : delivery.status === "not_configured" ? "warning" : "neutral"}>{delivery.status.replace("_", " ")}</Badge>{delivery.lastError ? <p className="mt-1 max-w-[220px] truncate text-[8px] text-danger" title={delivery.lastError}>{delivery.lastError}</p> : null}</td>
                    <td className="px-3 py-2 tabular text-[9px]">{delivery.attempts}</td>
                    <td className="px-3 py-2 text-[8.5px] text-muted-foreground">{formatDateTime(delivery.createdAt)}</td>
                    <td className="px-3 py-2">
                      {["failed", "not_configured"].includes(delivery.status) ? (
                        <AdminActionForm action={retryEmailDeliveryAction} hidden={{ deliveryId: delivery.id }} submitLabel="Retry" pendingLabel="Retrying…" variant="subtle" compact />
                      ) : <span className="text-[8.5px] text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9px] leading-4 text-muted-foreground">
        <p className="font-medium text-foreground">Render environment</p>
        <p className="mt-1">Set <code>EMAIL_PROVIDER=resend</code>, <code>EMAIL_API_KEY</code>, <code>EMAIL_FROM</code>, optionally <code>EMAIL_SUPPORT_EMAIL</code>, and <code>NEXT_PUBLIC_APP_URL</code>. All provider calls use HTTPS. No SMTP ports, no paid Render plan and no API key in the browser.</p>
      </div>
    </div>
  );
}
