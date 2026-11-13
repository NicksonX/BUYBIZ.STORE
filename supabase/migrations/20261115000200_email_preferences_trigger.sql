create or replace function public.ensure_email_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_preferences
    (user_id, marketing_opt_in, deposit_reminders_opt_in, unsubscribe_token)
  values (new.id, false, true, replace(gen_random_uuid()::text, '-', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_email_preferences on public.profiles;
create trigger profiles_email_preferences
after insert on public.profiles
for each row
when (new.role = 'customer')
execute function public.ensure_email_preferences();

insert into public.email_preferences
  (user_id, marketing_opt_in, deposit_reminders_opt_in, unsubscribe_token)
select p.id, false, true, replace(gen_random_uuid()::text, '-', '')
  from public.profiles p
 where p.role='customer'
on conflict (user_id) do nothing;
