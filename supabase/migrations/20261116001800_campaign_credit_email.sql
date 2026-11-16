update public.email_templates set
  preheader = 'Your $10 USD campaign reward is now available.',
  intro = 'Your $10 USD referral campaign reward has been credited to your BUYBIZ USD Reward Balance. You can view the transaction in Rewards.'
where type = 'campaign_customer_reward';

update public.email_templates set
  preheader = 'Your referral reward is now available.',
  intro = 'Your $10 USD referrer reward has been credited to your BUYBIZ USD Reward Balance. You can view the transaction in Rewards.'
where type = 'campaign_referrer_reward';
