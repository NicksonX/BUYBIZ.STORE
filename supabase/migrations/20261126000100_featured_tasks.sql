create table if not exists public.featured_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  instructions text not null default '',
  banner_url text,
  category text not null default 'social',
  reward_usd_cents integer not null check (reward_usd_cents > 0),
  reward_asset text not null default 'USDT',
  network text not null default 'BEP20',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','paused','closed','archived')),
  submissions_enabled boolean not null default true,
  manual_review boolean not null default true,
  max_participants integer,
  official_post_url text,
  required_actions jsonb not null default '[]'::jsonb,
  proof_requirements jsonb not null default '[]'::jsonb,
  one_reward_per_ip boolean not null default true,
  payout_giveaway_id uuid references public.giveaways(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint featured_task_window check (ends_at > starts_at)
);
create index if not exists featured_tasks_status_idx on public.featured_tasks(status, starts_at, ends_at);
alter table public.featured_tasks enable row level security;

create table if not exists public.featured_task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.featured_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  x_username text not null,
  quote_post_url text not null,
  screenshot_data bytea not null,
  screenshot_mime text not null default 'image/png',
  screenshot_hash text not null,
  wallet_address text not null,
  ip_address inet,
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected','reward_pending','queued','paid','payment_failed')),
  risk_level text not null default 'review_recommended' check (risk_level in ('low','review_recommended','high_risk','potential_duplicate','likely_fraud')),
  risk_score integer not null default 0,
  screening jsonb not null default '{}'::jsonb,
  admin_override_reason text,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  paid_at timestamptz,
  transaction_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, user_id)
);
create unique index if not exists featured_submissions_quote_unique on public.featured_task_submissions (task_id, lower(quote_post_url));
create unique index if not exists featured_submissions_x_unique on public.featured_task_submissions (task_id, lower(x_username));
create index if not exists featured_submissions_task_status_idx on public.featured_task_submissions(task_id, status, created_at desc);
create index if not exists featured_submissions_ip_idx on public.featured_task_submissions(task_id, ip_address);
alter table public.featured_task_submissions enable row level security;

insert into public.featured_tasks (slug,title,description,instructions,category,reward_usd_cents,reward_asset,network,starts_at,ends_at,status,submissions_enabled,manual_review,official_post_url,required_actions,proof_requirements,one_reward_per_ip)
values (
 'season-of-rewards-social-task',
 'Season of Rewards Social Task',
 'Complete the official X engagement steps for a chance to earn $0.50 USDT. This is a separate task reward. It is not the $10 Season of Rewards prize.',
 'Like, repost, comment on and quote the official BUYBIZ Season of Rewards post, then submit your quote link, a clear screenshot and your USDT BEP20 wallet address.',
 'social', 50, 'USDT', 'BEP20', now(), now() + interval '24 hours', 'published', true, true,
 'https://x.com/buybiz_company/status/2124209653324386590',
 '["Like the official post","Repost the official post","Leave a genuine comment","Quote post the official post"]'::jsonb,
 '["Quote-post URL","Screenshot proof","X username","USDT BEP20 wallet address"]'::jsonb,
 true
) on conflict (slug) do nothing;
