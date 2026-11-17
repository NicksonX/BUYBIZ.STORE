update public.campaigns
   set name = 'BUYBIZ Season of Rewards',
       description = 'Celebrate with BUYBIZ! Make a qualifying proxy purchase to earn $10, and earn an additional $10 for every friend you refer who completes a qualifying purchase.'
 where slug = 'customer-referrer-10';

update public.email_templates set
  subject = 'Congratulations! Your $10 BUYBIZ Campaign Reward Has Been Activated',
  preheader = 'Your campaign reward is confirmed and scheduled for payout.',
  intro = 'Your $10 BUYBIZ Season of Rewards campaign reward has been successfully activated. It is confirmed and scheduled to become available for payout on the configured campaign payout date.'
where type = 'campaign_customer_reward';

update public.email_templates set
  subject = 'Your $10 BUYBIZ Referral Campaign Reward Has Been Activated',
  preheader = 'Your referral reward is confirmed and scheduled for payout.',
  intro = 'Your $10 BUYBIZ Season of Rewards referral reward has been activated. It is scheduled to become available for payout on the configured campaign payout date.'
where type = 'campaign_referrer_reward';
