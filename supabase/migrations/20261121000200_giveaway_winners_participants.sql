alter table public.giveaway_claims add column if not exists is_winner boolean not null default false;
alter table public.giveaway_claims add column if not exists winner_position integer;
alter table public.giveaway_claims drop constraint if exists giveaway_claims_payment_status_check;
alter table public.giveaway_claims add constraint giveaway_claims_payment_status_check check (payment_status in ('pending','approved','processing','paid','failed','not_selected'));
with ranked as (
  select id,row_number() over (partition by giveaway_id order by claimed_at,id) as rn
  from public.giveaway_claims where giveaway_id='0db86571-564b-40f1-8812-c48f021b6e55'
)
update public.giveaway_claims c set is_winner=(r.rn<=20), winner_position=case when r.rn<=20 then r.rn else null end
from ranked r where c.id=r.id;
update public.giveaway_claims set reward_amount_usd_cents=0,payment_status='not_selected' where giveaway_id='0db86571-564b-40f1-8812-c48f021b6e55' and is_winner=false;
update public.giveaways set status='active',claimed_count=(select count(*) from public.giveaway_claims where giveaway_id='0db86571-564b-40f1-8812-c48f021b6e55') where id='0db86571-564b-40f1-8812-c48f021b6e55';
create index if not exists giveaway_claims_winner_idx on public.giveaway_claims(giveaway_id,is_winner,claimed_at);
