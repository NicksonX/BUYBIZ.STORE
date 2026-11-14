# Referral campaigns and USD rewards

## Existing referral / Ambassador programme

- A referral earns **1,000 NGN wallet credits** after the referred customer makes one verified external Paystack deposit of at least **₦2,000**.
- Wallet rewards stay in the immutable NGN `wallet_ledger`; they are not cash-withdrawable.
- At **10 qualified referrals**, the referrer is automatically promoted to Ambassador.
- Ambassadors earn **$3 USD** per qualified referral, uncapped, in the separate `ambassador_ledger`.
- Ambassador payouts are USDT BEP20 from **$10**, after address verification and manual review.
- The programme is **ongoing with no end date**; it stays active until an admin pauses it. The next scheduled $3 payout batch is configured in `app_settings.ambassador_next_payout_at` (currently **20 December 2026**, Africa/Lagos). That date is a payout-cycle date, never a campaign end date.
- Existing ambassador payout request and admin approval flow is unchanged.

## $10 customer + $10 referrer campaign

- Default campaign: `customer-referrer-10`, 20 November 2026 00:00 through 23 December 2026 23:59, Africa/Lagos.
- Payout date: 24 December 2026. Rewards become available for campaign payout requests on that date.
- A qualifying customer must register during the campaign, make one verified Paystack deposit of at least **₦2,000**, and complete one eligible proxy purchase during the campaign.
- The customer earns **$10** and a valid referrer earns **$10**, stored as separate `campaign_rewards` rows (`customer` and `referrer`).
- No valid referrer means the customer still earns $10; no referrer row is generated.
- Failed, reversed, refunded, or fraudulent activity does not qualify. Duplicate customer rewards are blocked by `(campaign_id, customer_id, role)` and idempotency keys. Duplicate referrer rewards are blocked by the referral/role unique index.
- Campaign USD balances are separate from NGN wallet credits and from Ambassador commissions.
- Payouts are USDT BEP20, manual, and require a verified address. A payout cannot be marked paid without a valid `0x` 32-byte transaction hash.

## Mobile wallet and transaction history

Mobile only:

- The balance card shows only the available balance, Add Money and History.
- No deposited/spent/refunded summary row and no minimum/credit-rate/cash-withdrawal text under the card.
- Recent transactions show four fields: name, date, right-aligned amount and a subtle status.
- Tapping a transaction opens a details sheet with the amount, status, method, reference (with copy) and support help when relevant.
- Search, All/Deposits/Purchases/Refunds filters and load-more are available in the mobile transaction history.
- Simulated/demo labels never appear in production transaction history; demo records exist only in demo mode.

## Operational requirement

Apply these migrations before deploying the matching application build:

1. `20261116000100_campaigns_usd_rewards.sql`
2. `20261116000200_campaigns_rls.sql`
3. `20261116000300_campaign_policy.sql`

The policy migration:
- lowers the wallet deposit minimum to **₦1,500**;
- sets every referral/campaign qualification deposit to **₦2,000**;
- updates the seeded campaign;
- sets the next Ambassador payout batch to **20 December 2026**.

## Campaign email notifications

Campaign rewards and campaign payouts send branded transactional emails through the same durable `email_deliveries` outbox:

- customer reward: "You earned $10 — your BUYBIZ reward is in"
- referrer reward: "You both win — your $10 referral reward is in"
- payout requested / approved / paid / rejected

The reward emails use an energetic dark campaign banner with dual reward chips, the payout date, one primary CTA and no fabricated participation numbers. Templates are seeded by `20261116000400_campaign_emails.sql` and polished by `20261116000500_email_polish.sql`.

The onboarding video recorded before this policy change still mentions the old ₦3,000 qualification amount and must be re-recorded before publishing it.
