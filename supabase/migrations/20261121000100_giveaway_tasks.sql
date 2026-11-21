alter table public.giveaways add column if not exists x_post_url text;
alter table public.giveaways add column if not exists tasks_enabled boolean not null default true;

create table if not exists public.giveaway_task_completions (
  id uuid primary key default gen_random_uuid(),
  giveaway_id uuid not null references public.giveaways (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_key text not null,
  verification_method text not null default 'self_reported',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint giveaway_task_key check (task_key in ('follow_x','like_post','repost_quote','join_telegram')),
  constraint giveaway_task_verification check (verification_method in ('self_reported','x_api','telegram_api')),
  unique (giveaway_id, user_id, task_key)
);
create index if not exists giveaway_task_user_idx on public.giveaway_task_completions (user_id, giveaway_id);
alter table public.giveaway_task_completions enable row level security;
