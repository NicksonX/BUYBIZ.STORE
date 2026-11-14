-- Campaign-specific transactional emails. These are service messages, not
-- marketing, and use the same durable email_deliveries outbox as wallet mail.

insert into public.email_templates (type, subject, preheader, intro, enabled) values
  ('campaign_customer_reward', 'You earned a $10 BUYBIZ campaign reward', 'Your qualifying activity earned a USD reward.', 'Your qualifying deposit and eligible purchase earned a campaign reward. It is separate from your BUYBIZ wallet balance.', true),
  ('campaign_referrer_reward', 'Your referral earned a $10 campaign reward', 'A referral completed both qualifying steps.', 'Someone you referred completed the qualifying deposit and purchase during the campaign. Your separate referrer reward has been recorded.', true),
  ('campaign_payout_requested', 'Your USD reward payout is pending review', 'We received your campaign payout request.', 'Your campaign reward payout has been requested and is waiting for manual review. No crypto payment has been sent yet.', true),
  ('campaign_payout_approved', 'Your USD reward payout was approved', 'Your USDT BEP20 payout is being processed.', 'Your campaign reward payout has been approved for manual processing. We will email you again when the transfer is complete.', true),
  ('campaign_payout_paid', 'Your USD reward payout has been sent', 'The BEP20 transfer is complete.', 'Your campaign reward payout has been marked paid. Keep the transaction hash below for your records.', true),
  ('campaign_payout_rejected', 'Your USD reward payout needs attention', 'Your campaign payout request was rejected.', 'Your campaign payout request was not approved. The reserved reward has been released back to your available USD rewards.', true)
on conflict (type) do update set
  subject = excluded.subject,
  preheader = excluded.preheader,
  intro = excluded.intro;
