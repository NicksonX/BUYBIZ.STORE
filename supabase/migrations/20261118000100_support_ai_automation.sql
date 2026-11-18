alter table public.support_messages
  add column if not exists is_ai boolean not null default false;

alter table public.support_tickets
  add column if not exists ai_auto_replied_at timestamptz,
  add column if not exists close_requested_at timestamptz,
  add column if not exists rating integer check (rating between 1 and 5),
  add column if not exists feedback text,
  add column if not exists rated_at timestamptz;

create index if not exists support_close_requested_idx
  on public.support_tickets (status, close_requested_at);
