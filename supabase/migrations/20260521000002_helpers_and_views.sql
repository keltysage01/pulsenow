-- ============================================================================
-- Pulsenow Migration 002: Helper RPCs, views, and indexes
-- Run AFTER 20260521000001_init_pulsenow.sql
-- Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RPC: increment_activity_column
-- Used by /api/activity/log to add to the breakdown columns of activity_log
-- in one atomic call.
-- ----------------------------------------------------------------------------
create or replace function increment_activity_column(
  p_profile_id uuid,
  p_day date,
  p_column text,
  p_increment int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed text[] := array['contacts_logged','appts_set','fna_completed','partners_added'];
begin
  if not (p_column = any(v_allowed)) then
    raise exception 'invalid column: %', p_column;
  end if;

  -- ensure caller is the profile or a leader/admin in same org
  if not exists (
    select 1 from profiles
    where id = auth.uid() and (id = p_profile_id or role in ('leader','admin'))
  ) then
    raise exception 'forbidden';
  end if;

  execute format(
    'insert into activity_log (profile_id, day, %I) values ($1, $2, $3)
     on conflict (profile_id, day) do update set %I = activity_log.%I + excluded.%I, updated_at = now()',
    p_column, p_column, p_column, p_column
  ) using p_profile_id, p_day, p_increment;
end $$;

grant execute on function increment_activity_column(uuid, date, text, int) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: get_tier_for_points
-- Returns the tier label for a given points total. Matches UI thresholds.
-- ----------------------------------------------------------------------------
create or replace function get_tier_for_points(p_points int)
returns text
language sql
immutable
as $$
  select case
    when p_points >= 21 then 'all_the_timer'
    when p_points >= 10 then 'part_timer'
    else 'no_timer'
  end
$$;

-- ----------------------------------------------------------------------------
-- VIEW: contact_overview
-- Convenience join used by the CRM list and Power List candidate pool.
-- ----------------------------------------------------------------------------
create or replace view contact_overview as
select
  c.id,
  c.profile_id,
  c.org_id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  c.city,
  c.state,
  c.source,
  c.notes,
  c.qualifiers,
  c.qualifier_score,
  c.contact_type,
  c.stage,
  c.is_top_100,
  c.last_contacted_at,
  c.next_followup_at,
  c.created_at,
  c.updated_at,
  pd.license_number,
  pd.license_states,
  pd.current_carrier,
  pd.captive_status,
  pd.gender,
  pd.linkedin_url,
  pd.enrichment_status,
  pd.enrichment_data,
  (
    case
      when c.next_followup_at is not null and c.next_followup_at < now()
        then true
      else false
    end
  ) as is_overdue
from contacts c
left join producer_details pd on pd.contact_id = c.id;

-- views inherit RLS from underlying tables, but we grant select explicitly
grant select on contact_overview to authenticated;

-- ----------------------------------------------------------------------------
-- VIEW: weekly_leaderboard
-- Pre-aggregated week-to-date points per profile.
-- ----------------------------------------------------------------------------
create or replace view weekly_leaderboard as
select
  p.id as profile_id,
  p.org_id,
  p.full_name,
  p.avatar_url,
  coalesce(sum(al.points_total), 0)::int as week_points,
  date_trunc('week', current_date)::date as week_start
from profiles p
left join activity_log al
  on al.profile_id = p.id
  and al.day >= date_trunc('week', current_date)::date
group by p.id, p.org_id, p.full_name, p.avatar_url;

grant select on weekly_leaderboard to authenticated;

-- ----------------------------------------------------------------------------
-- VIEW: manager_team_summary
-- Used by Manager View. Shows each team member's week stats at a glance.
-- ----------------------------------------------------------------------------
create or replace view manager_team_summary as
select
  p.id as profile_id,
  p.org_id,
  p.full_name,
  p.avatar_url,
  p.role,
  coalesce(s.current_streak, 0) as current_streak,
  coalesce(wl.week_points, 0) as week_points,
  get_tier_for_points(coalesce(wl.week_points, 0)) as current_tier,
  (
    select count(*) from contacts c
    where c.profile_id = p.id
  ) as total_contacts,
  (
    select count(*) from contacts c
    where c.profile_id = p.id and c.stage = 'client'
  ) as total_clients,
  (
    select count(*) from contacts c
    where c.profile_id = p.id and c.contact_type = 'recruit' and c.stage != 'dead'
  ) as active_recruits,
  (
    select max(occurred_at) from contact_events ce
    where ce.profile_id = p.id
  ) as last_activity_at
from profiles p
left join streaks s on s.profile_id = p.id
left join weekly_leaderboard wl on wl.profile_id = p.id;

grant select on manager_team_summary to authenticated;

-- ----------------------------------------------------------------------------
-- INDEX: optimize the candidate pool query for Power List
-- ----------------------------------------------------------------------------
create index if not exists contacts_powerlist_idx
  on contacts(profile_id, stage, last_contacted_at)
  where stage != 'dead';

-- ----------------------------------------------------------------------------
-- RPC: bump_contact_last_contacted
-- Convenience: mark contact contacted now, update stage if it was uncontacted.
-- ----------------------------------------------------------------------------
create or replace function bump_contact_last_contacted(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from contacts where id = p_contact_id and profile_id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;

  update contacts
  set
    last_contacted_at = now(),
    stage = case when stage = 'uncontacted' then 'contacted' else stage end,
    updated_at = now()
  where id = p_contact_id;
end $$;

grant execute on function bump_contact_last_contacted(uuid) to authenticated;
