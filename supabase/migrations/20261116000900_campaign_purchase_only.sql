-- The $10 campaign is unlocked by a completed 7-day+ proxy purchase.
-- A separate wallet-deposit threshold is no longer required.

alter table public.campaign_rewards
  alter column qualifying_deposit_id drop not null;

update public.campaigns
   set qualifying_deposit_minor = 0,
       description = 'When a new customer joins, funds and purchases at least an eligible 7-day+ proxy plan, both the customer and their referrer earn $10 in USD rewards.',
       terms = 'The customer must complete a proxy purchase of 7 days or more during the campaign window. One customer reward per qualifying customer. One referrer reward per distinct qualifying customer. Self-referrals, failed, reversed, refunded or fraudulent transactions do not qualify. USD rewards are paid in USDT on BNB Smart Chain (BEP20) after manual review.',
       updated_at = now()
 where slug = 'customer-referrer-10';

update public.email_templates set
  preheader = 'Your qualifying 7-day+ proxy purchase counted.',
  intro = 'Your qualifying 7-day-or-longer proxy purchase earned a campaign reward. It sits in USD Rewards, separate from your BUYBIZ wallet balance.'
where type = 'campaign_customer_reward';

update public.email_templates set
  intro = 'Someone you referred completed a 7-day-or-longer proxy purchase during the campaign. Your separate referrer reward has been recorded, and they earned $10 too.'
where type = 'campaign_referrer_reward';
