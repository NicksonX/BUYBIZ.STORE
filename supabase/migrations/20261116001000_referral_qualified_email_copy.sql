update public.email_templates set
  subject = 'Your referral made a qualifying purchase',
  preheader = 'Your friend has met the referral requirement.',
  intro = 'Your friend completed a qualifying 7-day-or-longer proxy purchase. We are checking and crediting your referral reward now.'
where type = 'referral_qualified';
