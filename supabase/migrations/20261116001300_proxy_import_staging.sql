alter table public.proxy_import_batches
  add column if not exists entries jsonb not null default '[]'::jsonb,
  add column if not exists encrypted_payload text,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();
