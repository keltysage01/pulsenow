-- CRM pipeline parity (applied to production 2026-07-14 via MCP as
-- migration "crm_pipeline_econ_parity"; this file mirrors it for the repo).
--
-- Adds the econ-OS-style CRM object model on top of Contact Intelligence:
--   1. contacts gains health_score / deal_value_cents / last_activity_at
--   2. clients table; contacts graduate there when stage moves to won
--   3. notifications table (type/title/body/link_url/is_read per user)
--   4. pulse_graduate_won_contact trigger
--   5. pulse_decay_health_scores() - daily health decay, scheduled via
--      pg_cron job 'pulse-health-decay-daily' at 08:30 UTC
--   6. pulse_leaderboard view (30d activity points + open pipeline value)
--   7. crm_next_actions view (AI research surfaced as a ranked call list)

alter table contacts add column if not exists health_score integer not null default 70;
alter table contacts add column if not exists deal_value_cents bigint not null default 0;
alter table contacts add column if not exists last_activity_at timestamptz not null default now();

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  profile_id uuid not null,
  contact_id uuid references contacts(id) on delete set null,
  name text not null,
  email text,
  phone text,
  health_score integer not null default 80,
  mrr_cents bigint not null default 0,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clients_contact_id_uniq on clients(contact_id) where contact_id is not null;
alter table clients enable row level security;
create policy "clients owner all" on clients
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "clients org read" on clients
  for select using (org_id = pulse_auth_org_id());

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null default 'info',
  title text not null,
  body text,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, is_read, created_at desc);
alter table notifications enable row level security;
create policy "notifications owner select" on notifications
  for select using (user_id = auth.uid());
create policy "notifications owner update" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function pulse_graduate_won_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(new.stage, '')) in ('won', 'client')
     and lower(coalesce(old.stage, '')) not in ('won', 'client') then
    insert into clients (org_id, profile_id, contact_id, name, email, phone, notes)
    values (
      new.org_id, new.profile_id, new.id,
      coalesce(nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''), 'Unnamed Contact'),
      new.email, new.phone, new.notes
    )
    on conflict (contact_id) where contact_id is not null do nothing;

    insert into notifications (user_id, type, title, body)
    values (
      new.profile_id, 'pipeline', 'New client won',
      coalesce(nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''), 'A contact') ||
      ' moved to Won and was added to Clients.'
    );
  end if;
  return new;
end $$;

drop trigger if exists contacts_graduate_won on contacts;
create trigger contacts_graduate_won
  after update of stage on contacts
  for each row execute function pulse_graduate_won_contact();

create or replace function pulse_decay_health_scores() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  prospects_decayed integer := 0;
  clients_decayed integer := 0;
begin
  update contacts
  set health_score = greatest(0, health_score - 2)
  where lower(coalesce(stage, '')) not in ('won', 'lost', 'client')
    and greatest(coalesce(last_activity_at, created_at), coalesce(last_contacted_at, created_at))
        < now() - interval '7 days'
    and health_score > 0;
  get diagnostics prospects_decayed = row_count;

  with decayed as (
    update clients
    set health_score = greatest(0, health_score - 1), updated_at = now()
    where last_activity_at < now() - interval '14 days'
      and health_score > 0
    returning profile_id, name, health_score
  )
  insert into notifications (user_id, type, title, body)
  select profile_id, 'health', 'Client needs attention',
         name || ' has a health score of ' || health_score || '. Time to check in.'
  from decayed
  where health_score = 49;
  get diagnostics clients_decayed = row_count;

  return jsonb_build_object('prospects_decayed', prospects_decayed, 'clients_decayed', clients_decayed, 'ran_at', now());
end $$;
revoke execute on function pulse_decay_health_scores() from anon, authenticated;

create or replace view pulse_leaderboard with (security_invoker = on) as
select
  p.id as profile_id,
  p.org_id,
  p.full_name,
  coalesce(a.points_30d, 0) as points_30d,
  coalesce(c.open_deal_value_cents, 0) as open_deal_value_cents,
  coalesce(c.open_deals, 0) as open_deals,
  coalesce(cl.clients_count, 0) as clients_count,
  rank() over (
    partition by p.org_id
    order by coalesce(a.points_30d, 0) desc, coalesce(c.open_deal_value_cents, 0) desc
  ) as rank
from profiles p
left join (
  select profile_id, sum(points) as points_30d
  from pulse_activity_snapshots
  where day >= current_date - 30
  group by 1
) a on a.profile_id = p.id
left join (
  select profile_id, sum(deal_value_cents) as open_deal_value_cents, count(*) as open_deals
  from contacts
  where lower(coalesce(stage, '')) not in ('won', 'lost', 'client')
  group by 1
) c on c.profile_id = p.id
left join (
  select profile_id, count(*) as clients_count from clients group by 1
) cl on cl.profile_id = p.id;

create or replace view crm_next_actions with (security_invoker = on) as
select
  cr.user_id,
  cr.id as contact_record_id,
  cr.full_name,
  cr.email,
  cr.phone,
  cr.city,
  cr.state,
  a.priority_tier,
  a.candidate_type,
  a.next_best_action,
  a.suggested_message_angle,
  a.evidence_summary,
  a.confidence,
  case a.priority_tier
    when 'A' then 1 when 'B' then 2 when 'C' then 3 when 'MANUAL_REVIEW' then 4 else 5
  end as sort_order
from contact_ai_assessments a
join contact_records cr on cr.id = a.contact_id
where a.priority_tier in ('A', 'B', 'C', 'MANUAL_REVIEW')
  and coalesce(cr.do_not_contact, false) = false;

-- Scheduling (applied in production):
--   create extension if not exists pg_cron;
--   select cron.schedule('pulse-health-decay-daily', '30 8 * * *', $$select pulse_decay_health_scores()$$);
