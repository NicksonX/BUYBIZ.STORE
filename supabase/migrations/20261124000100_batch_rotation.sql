alter table public.proxy_rotations add column if not exists credential_group text;
alter table public.proxy_rotations add column if not exists scope text not null default 'inventory';
create index if not exists proxy_rotations_group_idx on public.proxy_rotations (credential_group, rotated_at desc);
