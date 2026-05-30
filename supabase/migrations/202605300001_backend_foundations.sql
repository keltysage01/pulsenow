-- PulseNow backend foundations for the existing static app shell.
-- The live project has drifted across earlier setup passes, so this migration
-- avoids assuming a specific organizations/profiles generation.

create extension if not exists pgcrypto;

insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'Fuel Your Legacy', 'fuelyourlegacy')
on conflict (slug) do update set
  name = excluded.name;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id text not null default '00000000-0000-0000-0000-000000000001',
  full_name text not null,
  agent_code text unique,
  leader_code text,
  role text default 'agent',
  pin_hash text,
  avatar_url text,
  mission_statement text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles
  add column if not exists level text default 'TA',
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists app_state jsonb not null default '{}'::jsonb;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  org_id text not null default '00000000-0000-0000-0000-000000000001',
  first_name text,
  last_name text,
  phone text,
  email text,
  city text,
  state text,
  source text default 'manual',
  notes text,
  qualifiers jsonb default '{}'::jsonb,
  qualifier_score int default 0,
  contact_type text default 'prospect',
  stage text default 'uncontacted',
  is_top_100 boolean default false,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.contacts
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists org_id text default '00000000-0000-0000-0000-000000000001',
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists source text default 'manual',
  add column if not exists notes text,
  add column if not exists qualifiers jsonb default '{}'::jsonb,
  add column if not exists qualifier_score int default 0,
  add column if not exists contact_type text default 'prospect',
  add column if not exists stage text default 'uncontacted',
  add column if not exists is_top_100 boolean default false,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_followup_at timestamptz,
  add column if not exists app_state jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default '00000000-0000-0000-0000-000000000001',
  name text not null,
  leader_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (team_id, profile_id)
);

create table if not exists public.pulse_activity_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  org_id text not null default '00000000-0000-0000-0000-000000000001',
  day date not null,
  fields jsonb not null default '{}'::jsonb,
  points int not null default 0,
  tier text not null default 'No Timer',
  feed jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, day)
);

create table if not exists public.pulse_badge_awards (
  profile_id uuid references public.profiles(id) on delete cascade not null,
  badge_id text not null,
  org_id text not null default '00000000-0000-0000-0000-000000000001',
  earned_at date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

create table if not exists public.pulse_wfg_team_rows (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  org_id text not null default '00000000-0000-0000-0000-000000000001',
  report_row_id text not null,
  matched boolean not null default false,
  match_source text,
  match_id text,
  row_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, report_row_id)
);

create index if not exists profiles_org_id_idx on public.profiles(org_id);
create index if not exists contacts_profile_idx on public.contacts(profile_id);
create index if not exists contacts_org_idx on public.contacts(org_id);
create index if not exists pulse_activity_snapshots_org_day_idx on public.pulse_activity_snapshots(org_id, day desc);
create index if not exists pulse_badge_awards_org_idx on public.pulse_badge_awards(org_id, earned_at desc);
create index if not exists pulse_wfg_team_rows_profile_idx on public.pulse_wfg_team_rows(profile_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.pulse_activity_snapshots enable row level security;
alter table public.pulse_badge_awards enable row level security;
alter table public.pulse_wfg_team_rows enable row level security;

create or replace function public.pulse_auth_org_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles read same org" on public.profiles;
create policy "profiles read same org"
on public.profiles for select
using (
  id = auth.uid()
  or org_id = public.pulse_auth_org_id()
);

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "contacts owner all" on public.contacts;
create policy "contacts owner all"
on public.contacts for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "contacts org read" on public.contacts;
create policy "contacts org read"
on public.contacts for select
using (org_id = public.pulse_auth_org_id());

drop policy if exists "teams org read" on public.teams;
create policy "teams org read"
on public.teams for select
using (org_id = public.pulse_auth_org_id());

drop policy if exists "team_members org read" on public.team_members;
create policy "team_members org read"
on public.team_members for select
using (
  team_id in (
    select id from public.teams
    where org_id = public.pulse_auth_org_id()
  )
);

drop policy if exists "pulse_activity owner all" on public.pulse_activity_snapshots;
create policy "pulse_activity owner all"
on public.pulse_activity_snapshots for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "pulse_badges owner all" on public.pulse_badge_awards;
create policy "pulse_badges owner all"
on public.pulse_badge_awards for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "pulse_wfg owner all" on public.pulse_wfg_team_rows;
create policy "pulse_wfg owner all"
on public.pulse_wfg_team_rows for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select on public.teams to authenticated;
grant select on public.team_members to authenticated;
grant select, insert, update, delete on public.pulse_activity_snapshots to authenticated;
grant select, insert, update, delete on public.pulse_badge_awards to authenticated;
grant select, insert, update, delete on public.pulse_wfg_team_rows to authenticated;
grant execute on function public.pulse_auth_org_id() to authenticated;
