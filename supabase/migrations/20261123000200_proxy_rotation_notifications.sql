alter table public.proxy_rotations
  add column if not exists notification_status text not null default 'pending'
    check (notification_status in ('pending','queued','completed','partial','failed','not_required')),
  add column if not exists notification_batch_id uuid,
  add column if not exists emails_queued integer not null default 0,
  add column if not exists emails_failed integer not null default 0;
create index if not exists proxy_rotations_notification_idx on public.proxy_rotations (notification_status, rotated_at desc);
update public.products set price_minor=180000, updated_at=now() where slug='proxy-7-days';
