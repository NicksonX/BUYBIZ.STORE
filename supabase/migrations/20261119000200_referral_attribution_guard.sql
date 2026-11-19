-- Referral attribution is immutable after insertion. Status and reward fields
-- may still change, but a referee cannot be moved to another referrer.
create or replace function public.protect_referral_attribution()
returns trigger
language plpgsql
as $$
begin
  if new.referrer_id is distinct from old.referrer_id
     or new.referee_id is distinct from old.referee_id
     or new.referral_code is distinct from old.referral_code then
    raise exception 'Referral attribution is immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists referrals_protect_attribution on public.referrals;
create trigger referrals_protect_attribution
before update of referrer_id, referee_id, referral_code on public.referrals
for each row execute function public.protect_referral_attribution();
