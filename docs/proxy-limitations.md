# Upstream proxy access limitations

BUYBIZ has a website account, upstream proxy authentication, and customer-facing access instructions. They are not the same credential.

## What is implemented

- Each proxy inventory row stores one encrypted upstream username/password.
- Every active allocation on that row uses the same upstream credential set.
- Customers get independent start and expiry timestamps from their own purchase.
- Active customers see the current credentials stored in BUYBIZ, including credentials updated by an administrator.
- Expired customers cannot load connection details from BUYBIZ after expiry.
- Manual rotation updates the credentials stored in BUYBIZ and records a versioned audit event without storing old passwords.
- Shared proxies can be separated by package (24-hour, 7-day, 30-day/personal) and by credential group.

## What is not implemented

- BUYBIZ does not generate working per-customer upstream usernames or passwords. The provider does not expose a documented API or per-user authentication on the current manual setup.
- BUYBIZ cannot revoke an already copied upstream password, disconnect an individual customer at the network layer, or expire a single customer inside the provider.
- Removing credentials from BUYBIZ after expiry does not stop a customer who already copied them from using the upstream proxy until the provider changes the shared login.
- Changing the upstream credentials in BUYBIZ does not change them at the provider. The administrator must complete that change upstream.
- BUYBIZ cannot confirm provider-side authentication failures without a provider API or an active probe.
- No proxy gateway, VPS, paid SMS/voice provider or paid email provider has been purchased or deployed.

## Rotation warning

A shared credential change can affect every active customer on that inventory. The admin rotation screen shows active and expired counts and requires explicit confirmation. New credentials become available to active customers immediately, but the provider may invalidate the old credentials. Customers with independent expiries are never silently expired or extended by a rotation.

## Scheduling

In-app administrator reminders and inactivity checks are run by server-side PostgreSQL jobs:

- `buybiz-admin-reminders` every 15 minutes.
- `buybiz-inactivity` hourly.
- Existing lifecycle processing expires entitlements and reconciles capacity.

Email, SMS and voice reminders remain disabled until an approved external provider is configured.
