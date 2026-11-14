update public.email_templates set
  preheader = 'Your qualifying deposit and 7-day+ proxy purchase counted.',
  intro = 'Your qualifying deposit and 7-day-or-longer proxy purchase earned a campaign reward. It sits in USD Rewards, separate from your BUYBIZ wallet balance.'
where type = 'campaign_customer_reward';

update public.email_templates set
  intro = 'Someone you referred completed the qualifying deposit and a 7-day-or-longer proxy purchase during the campaign. Your separate referrer reward has been recorded, and they earned $10 too.'
where type = 'campaign_referrer_reward';
