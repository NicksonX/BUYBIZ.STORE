import Link from "next/link";
import {
  AlertTriangle,
  Database,
  FlaskConical,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Select } from "@/components/ui/input";
import { requireSuperAdminPage } from "@/server/auth/guards";
import { getAppSettings } from "@/server/data/settings";
import {
  isDatabaseConfigured,
  isDemoMode,
  isPaystackConfigured,
  isSupabaseAuthConfigured,
  getPaystackMode,
} from "@/lib/config";
import {
  runLifecycleAction,
  updateSettingsAction,
} from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireSuperAdminPage();
  const settings = await getAppSettings();
  const config = [
    {
      label: "Application database",
      ok: isDatabaseConfigured(),
      value: isDemoMode() ? "Demo PGlite" : "Supabase Postgres",
    },
    {
      label: "Authentication",
      ok: isSupabaseAuthConfigured(),
      value: isSupabaseAuthConfigured() ? "Supabase Auth" : "Local demo sessions",
    },
    {
      label: "Paystack",
      ok: isPaystackConfigured(),
      value: isPaystackConfigured() ? `${getPaystackMode()} mode` : "Not configured",
    },
    {
      label: "Proxy encryption",
      ok: true,
      value: "Server-side key",
    },
    {
      label: "Upstream proxy provider",
      ok: false,
      value: "Manual credentials only",
    },
    {
      label: "Admin email / SMS / voice",
      ok: false,
      value: "External provider not configured",
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Super-admin only. These settings affect checkout limits, inventory defaults and platform availability."
        actions={<Badge tone="solid">Super admin</Badge>}
      />

      <div className="mt-4 grid items-start gap-3 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-card rounded-[14px] p-4 sm:p-5">
          <h2 className="text-[12px] font-semibold">Operating settings</h2>
          <p className="mt-1 text-[9.5px] text-muted-foreground">
            No secrets are stored here. Payment keys and database URLs live only in
            the hosting environment.
          </p>
          <div className="mt-4">
            <AdminActionForm
              action={updateSettingsAction}
              submitLabel="Save settings"
              pendingLabel="Saving…"
              confirmMessage="Apply these platform settings?"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Default maximum seats" htmlFor="default-seats" hint="1-10">
                  <Input id="default-seats" name="inventoryDefaultMaxSeats" type="number" min={1} max={10} defaultValue={settings.inventoryDefaultMaxSeats} />
                </AdminField>
                <AdminField label="Safety buffer (minutes)" htmlFor="safety-buffer">
                  <Input id="safety-buffer" name="allocationSafetyBufferMinutes" type="number" min={0} max={10080} defaultValue={Math.round(settings.allocationSafetyBufferSeconds / 60)} />
                </AdminField>
                <AdminField label="Assumed stock life (days)" htmlFor="stock-days">
                  <Input id="stock-days" name="stockExpiryDefaultDays" type="number" min={1} max={365} defaultValue={settings.stockExpiryDefaultDays} />
                </AdminField>
                <AdminField label="Maintenance mode" htmlFor="maintenance">
                  <Select id="maintenance" name="maintenanceMode" defaultValue={String(settings.maintenanceMode)}>
                    <option value="false">Off</option>
                    <option value="true">On: pause purchases and deposits</option>
                  </Select>
                </AdminField>
                <AdminField label="Minimum deposit (NGN)" htmlFor="deposit-min">
                  <Input id="deposit-min" name="depositMin" inputMode="decimal" defaultValue={(settings.depositMinMinor / 100).toString()} />
                </AdminField>
                <AdminField label="Maximum deposit (NGN)" htmlFor="deposit-max">
                  <Input id="deposit-max" name="depositMax" inputMode="decimal" defaultValue={(settings.depositMaxMinor / 100).toString()} />
                </AdminField>
                <AdminField label="Inactivity freeze (days)" htmlFor="inactivity-days" hint="Default 60. Minimum 1.">
                  <Input id="inactivity-days" name="inactivityDays" type="number" min={1} max={3650} defaultValue={settings.inactivityDays} />
                </AdminField>
                <AdminField label="Reactivation fee (NGN)" htmlFor="reactivation-fee">
                  <Input id="reactivation-fee" name="reactivationFee" inputMode="decimal" defaultValue={(settings.reactivationFeeMinor / 100).toString()} />
                </AdminField>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <AdminField label="Admin reminder email" htmlFor="admin-email" hint="Optional. Delivery is off until an email provider is configured.">
                  <Input id="admin-email" name="adminNotificationEmail" type="email" defaultValue={settings.adminNotificationEmail} placeholder="alerts@buybiz.store" />
                </AdminField>
                <AdminField label="Admin SMS phone" htmlFor="admin-phone" hint="Optional. No SMS provider is configured.">
                  <Input id="admin-phone" name="adminNotificationPhone" defaultValue={settings.adminNotificationPhone} placeholder="+234..." />
                </AdminField>
                <AdminField label="Admin voice phone" htmlFor="admin-voice" hint="Optional. No voice-call provider is configured.">
                  <Input id="admin-voice" name="adminVoicePhone" defaultValue={settings.adminVoicePhone} placeholder="+234..." />
                </AdminField>
                <AdminField label="Reminder local time" htmlFor="admin-time" hint="Africa/Lagos by default">
                  <div className="flex gap-2">
                    <Input id="admin-time" name="adminReminderTime" type="time" defaultValue={settings.adminReminderTime} />
                    <Input name="adminTimezone" defaultValue={settings.adminTimezone} aria-label="Reminder timezone" />
                  </div>
                </AdminField>
              </div>
              <fieldset className="mt-3">
                <legend className="mb-2 text-[10px] font-medium text-foreground">Preferred reminder channels</legend>
                <div className="flex flex-wrap gap-3">
                  {[
                    ["in_app", "In-app", true],
                    ["email", "Email", false],
                    ["sms", "SMS", false],
                    ["voice", "Voice call", false],
                  ].map(([value, label, available]) => (
                    <label key={String(value)} className="inline-flex items-center gap-1.5 text-[9.5px] text-muted-foreground">
                      <input
                        type="checkbox"
                        name="adminNotificationChannels"
                        value={String(value)}
                        defaultChecked={settings.adminNotificationChannels.includes(String(value))}
                        className="h-3.5 w-3.5 rounded border-border-strong accent-foreground"
                      />
                      {label}
                      {!available ? <span className="text-[8px] text-warning">provider required</span> : null}
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[8.5px] leading-4 text-muted-foreground">
                  In-app notifications work now. Email, SMS and voice calls stay inactive
                  until an owner-approved provider is configured.
                </p>
              </fieldset>
              <AdminField label="Official support email" htmlFor="support-email" hint="Leave blank until supplied">
                <Input id="support-email" name="supportEmail" type="email" defaultValue={settings.supportEmail} placeholder="Not published" />
              </AdminField>
              <AdminNote tone="warning">
                Maintenance mode pauses new purchases and deposits. Existing proxy
                access remains active. Do not use it as a way to avoid refunds.
              </AdminNote>
            </AdminActionForm>
          </div>
        </section>

        <div className="space-y-3">
          <section className="surface-card rounded-[13px] p-4">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Database className="h-3.5 w-3.5" /> Environment
            </h2>
            <div className="mt-3 space-y-2.5">
              {config.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] text-muted-foreground">{item.label}</span>
                  <span className="flex items-center gap-1.5 text-[9px] font-medium">
                    <span className={`h-1.5 w-1.5 rounded-full ${item.ok ? "bg-success" : "bg-warning"}`} />
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[8.5px] leading-4 text-muted-foreground">
              Secrets are configured in Render, never displayed here. Enable
              Paystack live mode only after owner approval and end-to-end testing.
            </p>
          </section>

          <section className="surface-card rounded-[13px] p-4">
            <h2 className="flex items-center gap-1.5 text-[11px] font-semibold">
              <RefreshCw className="h-3.5 w-3.5" /> Lifecycle job
            </h2>
            <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
              Runs allocation expiry, upstream interruption, inventory
              reconciliation and stale deposit checks. It is safe to run repeatedly.
            </p>
            <div className="mt-3">
              <AdminActionForm
                action={runLifecycleAction}
                submitLabel="Run checks now"
                pendingLabel="Running…"
                variant="outline"
                confirmMessage="Run the lifecycle job now?"
              />
            </div>
          </section>

          <section className="rounded-[13px] border border-border bg-surface p-4">
            <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold">
              <KeyRound className="h-3.5 w-3.5" /> Internal transfers: off
            </h2>
            <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">
              The transfer service and wallet-transfer ledger are implemented
              behind a hard disabled flag. No customer UI or Server Action is
              connected. Before enabling, the owner must confirm real backing of
              balances and obtain legal/AML review.
            </p>
            <ul className="mt-2 space-y-1 text-[8.5px] leading-4 text-muted-foreground">
              <li>Verified recipient only, internal credit only.</li>
              <li>Double-entry ledger, unique references and audit logs.</li>
              <li>Transfer limits, no negative balances, no cash payout.</li>
              <li>Feature requires ENABLE_WALLET_TRANSFERS=true and a database setting.</li>
            </ul>
            <span className="mt-2 inline-flex rounded-full border border-warning/25 bg-warning-soft px-2 py-0.5 text-[8.5px] text-warning">
              Disabled pending compliance review
            </span>
          </section>

          <section className="rounded-[13px] border border-warning/20 bg-warning-soft p-4">
            <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> Open owner decisions
            </h2>
            <ul className="mt-2 space-y-1.5 text-[8.5px] leading-4 text-warning/80">
              <li>Whether upstream stock expires 30 days after upload or the provider supplies an exact expiry.</li>
              <li>Whether any upstream supports per-customer credentials or revocation. If not, expiry hides access but cannot revoke a shared credential.</li>
              <li>Official support contact details and the final legal entity information.</li>
            </ul>
          </section>

          <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              Terms and Privacy are marked as drafts and require legal review. See{" "}
              <Link href="/terms" className="underline">Terms</Link> and{" "}
              <Link href="/privacy" className="underline">Privacy</Link>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
