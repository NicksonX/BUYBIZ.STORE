update public.email_templates set
  subject = 'Deposit Successful — BUYBIZ',
  preheader = 'Your payment has been received and credited.',
  intro = 'Your payment has been successfully received and credited to your BUYBIZ wallet. Here are the details.'
where type = 'deposit_confirmation';
