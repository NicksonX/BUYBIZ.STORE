-- AI Proxy Assistant + deterministic support persistence.

alter table public.proxy_inventory
  add column if not exists country_code text,
  add column if not exists country_name text,
  add column if not exists exit_ip text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists latency_ms integer,
  add column if not exists last_verified_at timestamptz,
  add column if not exists verification_error text,
  add column if not exists fingerprint text,
  add column if not exists health_checked_at timestamptz;

alter table public.proxy_inventory drop constraint if exists proxy_verification_status_check;
alter table public.proxy_inventory add constraint proxy_verification_status_check check (
  verification_status in ('unverified','verified','failed','review_required')
);
create unique index if not exists proxy_inventory_fingerprint_idx
  on public.proxy_inventory (fingerprint) where fingerprint is not null;
create index if not exists proxy_inventory_country_idx
  on public.proxy_inventory (country_code, status, access_type);

create table if not exists public.proxy_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete restrict,
  expected_country_code text not null,
  total_entries integer not null default 0,
  parsed_entries integer not null default 0,
  verified_entries integer not null default 0,
  failed_entries integer not null default 0,
  mismatch_entries integer not null default 0,
  duplicate_entries integer not null default 0,
  saved_entries integer not null default 0,
  status text not null default 'processing',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint proxy_import_batch_status check (status in ('processing','completed','failed','cancelled'))
);
create index if not exists proxy_import_batches_created_idx on public.proxy_import_batches (created_at desc);

create table if not exists public.proxy_verification_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.proxy_import_batches (id) on delete set null,
  inventory_id uuid references public.proxy_inventory (id) on delete set null,
  host text not null,
  port integer not null,
  protocol text not null,
  status text not null,
  exit_ip text,
  country_code text,
  latency_ms integer,
  error_message text,
  checked_at timestamptz not null default now(),
  constraint proxy_verification_status check (status in ('verified','failed','review_required','unverified'))
);
create index if not exists proxy_verification_logs_inventory_idx on public.proxy_verification_logs (inventory_id, checked_at desc);

create table if not exists public.ai_support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open',
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_support_conversation_status check (status in ('open','escalated','closed'))
);
create index if not exists ai_support_conversations_user_idx on public.ai_support_conversations (user_id, updated_at desc);

create table if not exists public.ai_support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_support_conversations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  role text not null,
  body text not null,
  ticket_id uuid references public.support_tickets (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ai_support_message_role check (role in ('user','assistant','system'))
);
create index if not exists ai_support_messages_conversation_idx on public.ai_support_messages (conversation_id, created_at asc);

alter table public.proxy_import_batches enable row level security;
alter table public.proxy_verification_logs enable row level security;
alter table public.ai_support_conversations enable row level security;
alter table public.ai_support_messages enable row level security;

do $$ begin
  if to_regprocedure('public.is_admin()') is not null then
    drop policy if exists proxy_import_batches_admin on public.proxy_import_batches;
    create policy proxy_import_batches_admin on public.proxy_import_batches for all using (public.is_admin()) with check (public.is_admin());
    drop policy if exists proxy_verification_logs_admin on public.proxy_verification_logs;
    create policy proxy_verification_logs_admin on public.proxy_verification_logs for all using (public.is_admin()) with check (public.is_admin());
    drop policy if exists ai_support_conversations_own on public.ai_support_conversations;
    create policy ai_support_conversations_own on public.ai_support_conversations for select using (user_id = auth.uid() or public.is_admin());
    drop policy if exists ai_support_messages_own on public.ai_support_messages;
    create policy ai_support_messages_own on public.ai_support_messages for select using (user_id = auth.uid() or public.is_admin());
  end if;
end $$;
