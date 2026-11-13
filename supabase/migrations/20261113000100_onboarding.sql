-- New-user onboarding: capture the intended proxy use case.
-- Existing completed accounts stay completed. Only new profiles default to
-- incomplete once the auth trigger is updated.

alter table public.profiles
  add column if not exists proxy_use_case text;
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

do $$ begin
  alter table public.profiles
    add constraint profiles_proxy_use_case_check
    check (
      proxy_use_case is null or proxy_use_case in (
        'social_media', 'scraping', 'business', 'automation', 'research', 'other'
      )
    );
exception when duplicate_object then null; end $$;

alter table public.profiles
  alter column onboarding_complete set default false;

update public.profiles
   set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
 where onboarding_complete = true
   and onboarding_completed_at is null;
