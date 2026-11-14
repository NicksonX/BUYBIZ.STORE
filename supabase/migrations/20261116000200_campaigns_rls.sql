-- Campaign tables are written by the trusted server. Customers may read
-- only their own rewards and payout requests; admins can read all.

-- Public campaign pages need published campaigns. All writes remain server-side.
alter table public.campaigns enable row level security;
alter table public.campaign_rewards enable row level security;
alter table public.reward_payouts enable row level security;
alter table public.reward_payout_items enable row level security;

drop policy if exists "campaigns_select_published_or_admin" on public.campaigns;
create policy "campaigns_select_published_or_admin"
  on public.campaigns for select to authenticated
  using (status = 'published' or public.is_admin());

drop policy if exists "campaign_rewards_select_own_or_admin" on public.campaign_rewards;
create policy "campaign_rewards_select_own_or_admin"
  on public.campaign_rewards for select to authenticated
  using (beneficiary_id = auth.uid() or public.is_admin());

drop policy if exists "reward_payouts_select_own_or_admin" on public.reward_payouts;
create policy "reward_payouts_select_own_or_admin"
  on public.reward_payouts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "reward_payout_items_select_own_or_admin" on public.reward_payout_items;
create policy "reward_payout_items_select_own_or_admin"
  on public.reward_payout_items for select to authenticated
  using (
    exists (
      select 1 from public.reward_payouts p
       where p.id = payout_id and (p.user_id = auth.uid() or public.is_admin())
    )
  );
