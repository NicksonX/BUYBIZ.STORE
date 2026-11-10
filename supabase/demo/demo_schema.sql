-- Demo-only tables. Never applied to the production Supabase database.
-- Local authentication uses scrypt hashes here; production uses Supabase Auth.

create table if not exists public.demo_credentials (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists demo_password_resets_user_idx
  on public.demo_password_resets (user_id, expires_at desc);
