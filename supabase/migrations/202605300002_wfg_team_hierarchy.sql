-- Derive manager/team hierarchy from saved WFG imports.
-- Raw WFG rows stay in pulse_wfg_team_rows; this table stores queryable edges.

create table if not exists public.pulse_wfg_team_edges (
  id uuid primary key default gen_random_uuid(),
  source_profile_id uuid references public.profiles(id) on delete cascade not null,
  org_id text not null default '00000000-0000-0000-0000-000000000001',
  agent_code text not null,
  agent_name text not null,
  leader_code text,
  leader_name text,
  depth int not null default 0,
  matched_profile_id uuid references public.profiles(id) on delete set null,
  row_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_profile_id, agent_code)
);

create index if not exists pulse_wfg_team_edges_source_idx
on public.pulse_wfg_team_edges(source_profile_id, depth, agent_name);

create index if not exists pulse_wfg_team_edges_leader_idx
on public.pulse_wfg_team_edges(source_profile_id, leader_code);

create index if not exists pulse_wfg_team_edges_org_idx
on public.pulse_wfg_team_edges(org_id, agent_code);

alter table public.pulse_wfg_team_edges enable row level security;

drop policy if exists "pulse_wfg_edges owner all" on public.pulse_wfg_team_edges;
create policy "pulse_wfg_edges owner all"
on public.pulse_wfg_team_edges for all
using (source_profile_id = auth.uid())
with check (source_profile_id = auth.uid());

drop policy if exists "pulse_wfg_edges org read" on public.pulse_wfg_team_edges;
create policy "pulse_wfg_edges org read"
on public.pulse_wfg_team_edges for select
using (org_id = public.pulse_auth_org_id());

create or replace function public.pulse_rebuild_wfg_team_hierarchy()
returns table (
  inserted_count int,
  direct_count int,
  matched_profile_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org text;
  caller_code text;
begin
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  select p.org_id, upper(nullif(trim(p.agent_code), ''))
  into caller_org, caller_code
  from public.profiles p
  where p.id = caller_id;

  if caller_org is null then
    raise exception 'profile_not_found';
  end if;

  delete from public.pulse_wfg_team_edges
  where source_profile_id = caller_id;

  insert into public.pulse_wfg_team_edges (
    source_profile_id,
    org_id,
    agent_code,
    agent_name,
    leader_code,
    leader_name,
    depth,
    matched_profile_id,
    row_data
  )
  with recursive imported as (
    select
      r.row_data,
      upper(nullif(trim(r.row_data->>'agent_code'), '')) as agent_code,
      nullif(trim(coalesce(r.row_data->>'name', r.row_data->'raw'->>'full_name', r.row_data->'raw'->>'name')), '') as agent_name,
      upper(nullif(trim(r.row_data->>'leader_code'), '')) as leader_code
    from public.pulse_wfg_team_rows r
    where r.profile_id = caller_id
  ),
  cleaned as (
    select distinct on (agent_code)
      row_data,
      agent_code,
      coalesce(agent_name, 'WFG Agent ' || agent_code) as agent_name,
      leader_code
    from imported
    where agent_code is not null
    order by agent_code
  ),
  hierarchy as (
    select
      c.*,
      case when c.agent_code = caller_code then 0 else 1 end as depth
    from cleaned c
    where caller_code is not null
      and (c.agent_code = caller_code or c.leader_code = caller_code)

    union all

    select
      child.*,
      h.depth + 1
    from cleaned child
    join hierarchy h on child.leader_code = h.agent_code
    where h.depth < 8
  ),
  collapsed as (
    select distinct on (agent_code)
      row_data,
      agent_code,
      agent_name,
      leader_code,
      depth
    from hierarchy
    order by agent_code, depth
  )
  select
    caller_id,
    caller_org,
    h.agent_code,
    h.agent_name,
    h.leader_code,
    leader.agent_name as leader_name,
    h.depth,
    p.id as matched_profile_id,
    h.row_data
  from collapsed h
  left join cleaned leader on leader.agent_code = h.leader_code
  left join public.profiles p
    on p.org_id = caller_org
   and upper(nullif(trim(p.agent_code), '')) = h.agent_code
  on conflict (source_profile_id, agent_code) do update set
    org_id = excluded.org_id,
    agent_name = excluded.agent_name,
    leader_code = excluded.leader_code,
    leader_name = excluded.leader_name,
    depth = excluded.depth,
    matched_profile_id = excluded.matched_profile_id,
    row_data = excluded.row_data,
    updated_at = now();

  insert into public.teams (org_id, name, leader_id)
  select caller_org, coalesce(caller_code, 'WFG') || ' Team', caller_id
  where caller_code is not null
    and not exists (
      select 1 from public.teams t
      where t.org_id = caller_org and t.leader_id = caller_id
    );

  insert into public.team_members (team_id, profile_id)
  select t.id, e.matched_profile_id
  from public.teams t
  join public.pulse_wfg_team_edges e
    on e.source_profile_id = caller_id
   and e.matched_profile_id is not null
  where t.org_id = caller_org
    and t.leader_id = caller_id
  on conflict do nothing;

  return query
  select
    count(*)::int as inserted_count,
    count(*) filter (where e.depth = 1)::int as direct_count,
    count(*) filter (where e.matched_profile_id is not null)::int as matched_profile_count
  from public.pulse_wfg_team_edges e
  where e.source_profile_id = caller_id;
end;
$$;

grant select, insert, update, delete on public.pulse_wfg_team_edges to authenticated;
grant execute on function public.pulse_rebuild_wfg_team_hierarchy() to authenticated;
