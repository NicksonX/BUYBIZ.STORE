update public.campaigns
   set description = 'When a new customer joins, funds and purchases at least an eligible 7-day+ proxy plan, both the customer and their referrer earn $10 in USD rewards.',
       updated_at = now()
 where slug = 'customer-referrer-10';
