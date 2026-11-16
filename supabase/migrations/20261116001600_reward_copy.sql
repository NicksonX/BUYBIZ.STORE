update public.email_templates set
  subject = 'Your $3 USD referral reward was credited',
  preheader = 'A referral completed a qualifying 7-day+ purchase.',
  intro = 'A referral completed a qualifying proxy purchase. Your $3 USD referral reward was added to your USD reward balance.'
where type = 'ambassador_commission';

update public.email_templates set
  subject = 'Congratulations! Your $10 BUYBIZ Referral Campaign Reward Has Been Credited',
  preheader = 'Your $10 USD campaign reward is now available.',
  intro = 'Your $10 USD referral campaign reward has been credited to your BUYBIZ USD Reward Balance.'
where type = 'campaign_customer_reward';

update public.email_templates set
  subject = 'Your $10 BUYBIZ Referral Campaign Reward Has Been Credited',
  preheader = 'Your referral reward is now available.',
  intro = 'Your $10 USD referrer reward has been credited to your BUYBIZ USD Reward Balance.'
where type = 'campaign_referrer_reward';
