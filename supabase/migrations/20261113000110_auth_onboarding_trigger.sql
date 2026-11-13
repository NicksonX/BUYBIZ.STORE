-- All newly created Supabase Auth profiles must complete the BUYBIZ onboarding
-- use-case step. Existing profiles are not changed here.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
  v_placeholder text;
begin
  v_placeholder := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  v_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_display_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  if v_username is null or v_username !~ '^[A-Za-z0-9_]{3,24}$' then
    v_username := v_placeholder;
  elsif exists (
    select 1 from public.profiles where lower(username) = lower(v_username)
  ) then
    v_username := v_placeholder;
  end if;

  insert into public.profiles (
    id, username, email, display_name, email_verified, onboarding_complete, status
  )
  values (
    new.id,
    v_username,
    lower(coalesce(new.email, v_placeholder || '@placeholder.invalid')),
    coalesce(v_display_name, nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')),
    new.email_confirmed_at is not null,
    false,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
