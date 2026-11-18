alter table public.ai_admin_actions
  add column if not exists action_type text,
  add column if not exists status text not null default 'read_only' check (status in ('read_only','pending_approval','executing','completed','failed','cancelled')),
  add column if not exists payload jsonb,
  add column if not exists result jsonb,
  add column if not exists confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists confirmed_at timestamptz;
create index if not exists ai_admin_actions_user_idx on public.ai_admin_actions(user_id, created_at desc);
