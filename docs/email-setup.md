# BUYBIZ email setup

BUYBIZ uses a durable email outbox and an HTTPS email API. It does not open SMTP ports 25, 465 or 587. This keeps it compatible with Render's free web service.

## Provider environment

Set these only in Render (never in browser code):

```dotenv
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_...
EMAIL_FROM=hello@your-verified-domain.com
EMAIL_SUPPORT_EMAIL=support@your-verified-domain.com
EMAIL_OTP_SECRET=a-long-random-secret
NEXT_PUBLIC_APP_URL=https://buybiz.store
CRON_SECRET=a-long-random-secret
```

`EMAIL_FROM` must be a verified sender/domain at the email provider. The current adapter uses the Resend HTTPS API at `https://api.resend.com/emails`. No SMTP configuration is used.

The sender name, sender email and support email can also be stored from **Admin → Email management**. The API key and OTP secret are environment-only.

## Supabase Auth

1. Add the production domain and `/auth/callback`, `/auth/confirm` redirect URLs in Supabase Auth.
2. For branded OTP-only signup, turn off Supabase's duplicate "Confirm email" email in Supabase Auth email settings. BUYBIZ sends its own 6-digit code and confirms the auth user after successful OTP verification.
3. If Supabase email confirmation remains enabled, users may receive both the Supabase link and the BUYBIZ code. Either route works; the branded OTP is the intended experience.

If email credentials are not configured, BUYBIZ does not claim an email was sent. The admin screen shows **Email provider not configured**, and the existing Supabase verification link remains available.

## Scheduled worker on free Render

Render free web services cannot host a paid background cron. Schedule this HTTPS endpoint with a free scheduler such as cron-job.org, or your existing external cron:

```text
GET https://buybiz.store/api/cron/emails
Authorization: Bearer <CRON_SECRET>
```

Run it every 5–15 minutes. It is idempotent and does two jobs:

- Processes queued transactional email and retries recoverable failures.
- Queues deposit follow-ups for customers whose configured reminder window has passed and who have not opted out.

The existing Supabase `pg_cron` jobs continue to handle lifecycle and account reminders. They do not send email directly.

## Deliverability checks

- Verify the sending domain at the provider.
- Publish the provider's SPF and DKIM records.
- Set `EMAIL_SUPPORT_EMAIL` to a monitored inbox.
- Send one test welcome, one OTP and one deposit confirmation before launch.
- Check **Admin → Email management → Delivery log** after the test.
- Failed messages can be retried safely. Verification codes cannot be retried from the log; request a new code instead.

## Marketing consent

Marketing campaigns are opt-in and off by default. Deposit reminders have their own opt-in toggle and default to on for new customers; customers can manage both at `/email-preferences` and through the unsubscribe link in optional emails. Essential account messages remain separate.
