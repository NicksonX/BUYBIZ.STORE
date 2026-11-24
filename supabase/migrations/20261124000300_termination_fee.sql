alter table public.proxy_terminations add column if not exists termination_fee_minor bigint not null default 0;
