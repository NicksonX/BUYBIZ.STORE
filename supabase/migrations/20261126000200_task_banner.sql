alter table public.featured_tasks add column if not exists banner_data bytea;
alter table public.featured_tasks add column if not exists banner_mime text;
