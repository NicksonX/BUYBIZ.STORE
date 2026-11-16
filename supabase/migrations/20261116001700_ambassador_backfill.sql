insert into public.ambassador_profiles (user_id, promoted_at, qualified_referrals_at_promotion)
select r.referrer_id, now(), count(*)::int
  from public.referrals r
 where r.ambassador_qualified_at is not null
 group by r.referrer_id
having count(*) >= 2
on conflict (user_id) do nothing;
