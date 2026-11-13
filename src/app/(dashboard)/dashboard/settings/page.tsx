import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  LogOut,
  Moon,
  Mail,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/settings/profile-form";
import { PasswordForm } from "@/components/settings/password-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { EmailPreferencesForm } from "@/components/email/email-preferences-form";
import { logoutAction } from "@/server/actions/auth";
import { requireUserPage } from "@/server/auth/guards";
import { getEmailPreferences } from "@/server/services/email";
import { formatDate, truncateMiddle } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUserPage();
  const emailPreferences = await getEmailPreferences(user.id);

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Account and security."
        description="Update how BUYBIZ addresses you, manage your password and review your account status."
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <section className="surface-card rounded-[15px] p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                <UserRound className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold">Profile</h2>
                <p className="text-[9.5px] text-muted-foreground">
                  Shown only to you and BUYBIZ staff who support your account.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <ProfileForm
                username={user.username}
                displayName={user.displayName}
              />
            </div>
          </section>

          <section className="surface-card rounded-[15px] p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold">Password</h2>
                <p className="text-[9.5px] text-muted-foreground">
                  Use a unique password you do not use on other services.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <PasswordForm />
            </div>
          </section>

          <section className="surface-card rounded-[15px] p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold">Email preferences</h2>
                <p className="text-[9.5px] text-muted-foreground">
                  Optional marketing is separate from essential account email.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <EmailPreferencesForm
                email={user.email}
                marketingOptIn={emailPreferences.marketingOptIn}
                depositRemindersOptIn={emailPreferences.depositRemindersOptIn}
              />
            </div>
          </section>

          <section className="surface-card rounded-[15px] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                  <Moon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[13px] font-semibold">Appearance</h2>
                  <p className="text-[9.5px] text-muted-foreground">
                    Choose the dashboard theme you prefer. It is saved for this
                    browser.
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </section>
        </div>

        <div className="space-y-3">
          <section className="surface-card rounded-[15px] p-4">
            <h2 className="text-[11px] font-semibold">Account</h2>
            <dl className="mt-3 space-y-3 text-[10px]">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="mt-0.5 truncate font-medium">{user.email}</dd>
                  <dd className="mt-1">
                    {user.emailVerified ? (
                      <Badge tone="success">
                        <BadgeCheck className="h-3 w-3" /> Verified
                      </Badge>
                    ) : (
                      <Badge tone="warning">Unverified</Badge>
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDate(user.createdAt)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Account ID</dt>
                  <dd className="mt-0.5 font-mono text-[9px]">
                    {truncateMiddle(user.id, 8, 6)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Account status</dt>
                  <dd className="mt-0.5 font-medium capitalize">{user.status}</dd>
                </div>
              </div>
            </dl>
            {!user.emailVerified ? (
              <Link
                href="/verify-email"
                className="mt-4 flex h-8 w-full items-center justify-center rounded-full border border-warning/25 bg-warning-soft text-[10px] font-medium text-warning"
              >
                Verify email now
              </Link>
            ) : null}
          </section>

          <section className="rounded-[12px] border border-border bg-surface-subtle p-4">
            <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold">
              <Wallet className="h-3.5 w-3.5" /> Wallet status
            </h2>
            <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">
              Your wallet is an internal purchasing balance. There is no
              withdrawal or transfer-out feature. Deposits are credited only
              after server-side payment verification.
            </p>
            <Link
              href="/dashboard/wallet"
              className="mt-3 inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-[9.5px] font-medium hover:bg-accent"
            >
              Open wallet
            </Link>
          </section>

          <section className="surface-card rounded-[14px] p-4">
            <h2 className="text-[10.5px] font-semibold">Session</h2>
            <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
              Signing out clears your BUYBIZ session on this browser. Other
              devices are managed separately.
            </p>
            <form action={logoutAction} className="mt-3">
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-danger/25 bg-danger-soft px-3 text-[9.5px] font-medium text-danger hover:bg-danger/10"
              >
                <LogOut className="h-3 w-3" /> Sign out
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
