-- Polished, reward-led subjects and intros for campaign emails.

update public.email_templates set
  subject = 'You earned $10 — your BUYBIZ reward is in',
  preheader = 'Your qualifying deposit and purchase counted.',
  intro = 'Your qualifying deposit and eligible purchase earned a campaign reward. It sits in USD Rewards, separate from your BUYBIZ wallet balance.'
where type = 'campaign_customer_reward';

update public.email_templates set
  subject = 'You both win — your $10 referral reward is in',
  preheader = 'A referral completed both qualifying steps.',
  intro = 'Someone you referred completed the qualifying deposit and purchase during the campaign. Your separate referrer reward has been recorded, and they earned $10 too.'
where type = 'campaign_referrer_reward';

update public.email_templates set
  subject = 'Payout request received — pending review',
  preheader = 'We received your campaign payout request.',
  intro = 'Your campaign reward payout has been requested and is waiting for manual review. No crypto payment has been sent yet.'
where type = 'campaign_payout_requested';

update public.email_templates set
  subject = 'Approved — your USDT payout is being processed',
  preheader = 'Your BEP20 payout is moving forward.',
  intro = 'Your campaign reward payout has been approved for manual processing. We will email you again when the transfer is complete.'
where type = 'campaign_payout_approved';

update public.email_templates set
  subject = 'Paid — your USDT BEP20 transfer is complete',
  preheader = 'The BEP20 transfer is complete.',
  intro = 'Your campaign reward payout has been marked paid. Keep the transaction hash below for your records.'
where type = 'campaign_payout_paid';

update public.email_templates set
  subject = 'Your USD reward payout needs attention',
  preheader = 'Your campaign payout request was rejected.',
  intro = 'Your campaign payout request was not approved. The reserved reward has been released back to your available USD rewards.'
where type = 'campaign_payout_rejected';
