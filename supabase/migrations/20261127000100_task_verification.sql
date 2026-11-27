alter table public.featured_tasks drop constraint if exists featured_tasks_status_check;
update public.featured_tasks set status='draft' where status='published';
alter table public.featured_tasks add constraint featured_tasks_status_check check (status in ('draft','ready','active','paused','completed','closed','archived'));
alter table public.featured_tasks
  add column if not exists started_at timestamptz,
  add column if not exists follower_threshold integer not null default 100,
  add column if not exists internal_cap integer not null default 200,
  add column if not exists auto_approve boolean not null default true;
alter table public.featured_task_submissions
  add column if not exists followers_count integer,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verification_result jsonb not null default '{}'::jsonb,
  add column if not exists auto_approved boolean not null default false;
alter table public.featured_task_submissions drop constraint if exists featured_task_submission_verification_check;
alter table public.featured_task_submissions add constraint featured_task_submission_verification_check check (verification_status in ('pending','verified','ineligible','duplicate','suspicious','manual_review','verification_failed'));
update public.featured_tasks set status='draft', started_at=null where slug='season-of-rewards-social-task' and not exists (select 1 from public.featured_task_submissions s where s.task_id=featured_tasks.id);
