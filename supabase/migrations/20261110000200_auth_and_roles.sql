-- ============================================================================
-- BUYBIZ: Supabase auth integration
-- Apply this migration only on Supabase (it references the auth schema).
-- ============================================================================

-- Link profiles to Supabase Auth. Profile rows are never deleted casually;
-- deleting the auth user cascades the profile (and its history is retained in
-- financial tables via restrictive foreign keys, so deletion fails if the
-- customer has any financial history, intentionally).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_auth_user_fk'
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_fk
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Create a profile for each new Supabase Auth user.
-- Username is taken from sign-up metadata when valid/available; otherwise a
-- stable placeholder is issued and the user must finish onboarding.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
  v_onboarding boolean := true;
  v_placeholder text;
begin
  v_placeholder := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  v_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  v_display_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  if v_username is null or v_username !~ '^[A-Za-z0-9_]{3,24}$' then
    v_username := v_placeholder;
    v_onboarding := false;
  elsif exists (
    select 1 from public.profiles where lower(username) = lower(v_username)
  ) then
    v_username := v_placeholder;
    v_onboarding := false;
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
    v_onboarding,
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep the profile email-verification flag in sync with Supabase Auth.
create or replace function public.sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email_verified = new.email_confirmed_at is not null,
         email = lower(coalesce(new.email, email)),
         status = case
           when status = 'pending_verification' and new.email_confirmed_at is not null then 'active'::public.account_status
           else status
         end
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_auth_user();

-- Ensure the wallet exists for profiles that predate the wallet trigger.
insert into public.wallet_accounts (user_id)
select p.id from public.profiles p
left join public.wallet_accounts w on w.user_id = p.id
where w.id is null
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Admin helpers (security definer; safe for RLS policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and status = 'active'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('support', 'admin', 'super_admin')
      and status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
