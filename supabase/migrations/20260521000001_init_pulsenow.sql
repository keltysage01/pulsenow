-- ============================================================================
-- Pulsenow Initial Schema Migration
-- Run this in Supabase SQL editor for the Pulsenow project.
-- Idempotent: safe to re-run.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ORGANIZATIONS (white label support)
-- ============================================================================
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  branding_config jsonb default '{}'::jsonb,
  plan text default 'free' check (plan in ('free', 'pro', 'enterprise', 'white_label')),
  created_at timestamptz default now()
);

-- ============================================================================
-- PROFILES (extends auth.users)
-- ============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  org_id uuid references organizations on delete restrict,
  full_name text not null,
  agent_code text unique,
  leader_code text,
  role text default 'agent' check (role in ('agent', 'leader', 'admin')),
  pin_hash text,
  avatar_url text,
  mission_statement text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists profiles_org_id_idx on profiles(org_id);
create index if not exists profiles_role_idx on profiles(role);

-- ============================================================================
-- TEAMS
-- ============================================================================
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations on delete cascade not null,
  name text not null,
  leader_id uuid references profiles on delete set null,
  created_at timestamptz default now()
);

create table if not exists team_members (
  team_id uuid references teams on delete cascade,
  profile_id uuid references profiles on delete cascade,
  joined_at timestamptz default now(),
  primary key (team_id, profile_id)
);

create index if not exists teams_org_id_idx on teams(org_id);
create index if not exists team_members_profile_idx on team_members(profile_id);

-- ============================================================================
-- VISION BOARD + WEEKLY GOALS
-- ============================================================================
create table if not exists vision_board_items (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  label text not null,
  target_value numeric,
  current_value numeric default 0,
  display_order int default 0,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists weekly_goals (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  week_start_date date not null,
  goal_type text not null check (goal_type in ('contacts','appts_set','appts_done','prospects','points','partners')),
  target int not null default 0,
  actual int not null default 0,
  created_at timestamptz default now(),
  unique (profile_id, week_start_date, goal_type)
);

create index if not exists weekly_goals_profile_week_idx on weekly_goals(profile_id, week_start_date);

-- ============================================================================
-- CONTACTS (CRM core)
-- ============================================================================
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  org_id uuid references organizations on delete cascade not null,
  first_name text,
  last_name text,
  phone text,
  email text,
  city text,
  state text,
  zip text,
  source text default 'manual' check (source in ('manual','warm_list','purchased_list','social','referral','import')),
  notes text,
  qualifiers jsonb default '{}'::jsonb,
  qualifier_score int generated always as (
    (coalesce((qualifiers->>'married')::boolean,false))::int +
    (coalesce((qualifiers->>'age_25_plus')::boolean,false))::int +
    (coalesce((qualifiers->>'children')::boolean,false))::int +
    (coalesce((qualifiers->>'homeowner')::boolean,false))::int +
    (coalesce((qualifiers->>'income_40k')::boolean,false))::int +
    (coalesce((qualifiers->>'entrepreneurial')::boolean,false))::int +
    (coalesce((qualifiers->>'dissatisfied')::boolean,false))::int
  ) stored,
  contact_type text default 'prospect' check (contact_type in ('prospect','recruit','client','partner','top_100')),
  stage text default 'uncontacted' check (stage in ('uncontacted','contacted','appointment_set','fna_complete','client','recruit','partner','dead')),
  is_top_100 boolean default false,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists contacts_profile_idx on contacts(profile_id);
create index if not exists contacts_org_idx on contacts(org_id);
create index if not exists contacts_stage_idx on contacts(stage);
create index if not exists contacts_type_idx on contacts(contact_type);
create index if not exists contacts_followup_idx on contacts(next_followup_at) where next_followup_at is not null;
create index if not exists contacts_score_idx on contacts(qualifier_score desc);

-- ============================================================================
-- PRODUCER DETAILS (extension for licensed insurance producers)
-- ============================================================================
create table if not exists producer_details (
  contact_id uuid primary key references contacts on delete cascade,
  license_number text,
  license_states text[],
  license_type text,
  license_issued_date date,
  years_licensed int,
  current_carrier text,
  current_agency text,
  captive_status text check (captive_status in ('captive','independent','unknown')),
  gender text check (gender in ('male','female','non_binary','unknown')),
  linkedin_url text,
  social_links jsonb default '{}'::jsonb,
  enrichment_status text default 'pending' check (enrichment_status in ('pending','queued','enriched','failed')),
  enrichment_data jsonb,
  enriched_at timestamptz,
  classified_at timestamptz
);

create index if not exists producer_captive_idx on producer_details(captive_status);
create index if not exists producer_gender_idx on producer_details(gender);
create index if not exists producer_enrichment_idx on producer_details(enrichment_status);

-- ============================================================================
-- CONTACT EVENTS (interaction log)
-- ============================================================================
create table if not exists contact_events (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts on delete cascade not null,
  profile_id uuid references profiles on delete cascade not null,
  event_type text not null check (event_type in (
    'called','texted','emailed','dm_sent','met','fna_done','no_show',
    'signed_client','signed_partner','referred','dead_lead','note_added'
  )),
  notes text,
  points_earned int default 0,
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists contact_events_contact_idx on contact_events(contact_id);
create index if not exists contact_events_profile_idx on contact_events(profile_id);
create index if not exists contact_events_occurred_idx on contact_events(occurred_at desc);

-- ============================================================================
-- ACTIVITY LOG (daily summary) + POINTS LEDGER (immutable audit)
-- ============================================================================
create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  day date not null,
  contacts_logged int default 0,
  appts_set int default 0,
  fna_completed int default 0,
  partners_added int default 0,
  points_total int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (profile_id, day)
);

create table if not exists points_ledger (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  points int not null,
  source text not null check (source in (
    'contact_block','appt_set','fna_complete','partner_added',
    'streak_bonus','assessment_complete','adjustment'
  )),
  reference_id uuid,
  awarded_at timestamptz default now()
);

create index if not exists activity_log_profile_day_idx on activity_log(profile_id, day desc);
create index if not exists points_ledger_profile_idx on points_ledger(profile_id, awarded_at desc);

-- ============================================================================
-- STREAKS
-- ============================================================================
create table if not exists streaks (
  profile_id uuid primary key references profiles on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_active_day date,
  updated_at timestamptz default now()
);

-- ============================================================================
-- PIPELINE (Kanban boards)
-- ============================================================================
create table if not exists pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations on delete cascade not null,
  name text not null,
  board_type text not null check (board_type in ('sales','recruit')),
  display_order int default 0,
  color text default '#38B249',
  created_at timestamptz default now()
);

create table if not exists pipeline_cards (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts on delete cascade not null,
  profile_id uuid references profiles on delete cascade not null,
  stage_id uuid references pipeline_stages on delete restrict not null,
  display_order int default 0,
  moved_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists pipeline_history (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid references pipeline_cards on delete cascade not null,
  from_stage_id uuid references pipeline_stages,
  to_stage_id uuid references pipeline_stages not null,
  moved_by uuid references profiles,
  moved_at timestamptz default now()
);

create index if not exists pipeline_cards_stage_idx on pipeline_cards(stage_id, display_order);
create index if not exists pipeline_cards_profile_idx on pipeline_cards(profile_id);
create index if not exists pipeline_history_card_idx on pipeline_history(card_id, moved_at desc);

-- ============================================================================
-- AI COACH (sessions + messages)
-- ============================================================================
create table if not exists coach_sessions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  session_type text not null check (session_type in ('tactical','all_the_timer','who_to_call','pipeline','general')),
  title text,
  started_at timestamptz default now(),
  last_message_at timestamptz default now()
);

create table if not exists coach_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references coach_sessions on delete cascade not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tokens_used int,
  created_at timestamptz default now()
);

create index if not exists coach_sessions_profile_idx on coach_sessions(profile_id, last_message_at desc);
create index if not exists coach_messages_session_idx on coach_messages(session_id, created_at);

-- ============================================================================
-- PERSONALITY ASSESSMENTS
-- ============================================================================
create table if not exists assessments (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  assessment_type text not null check (assessment_type in ('four_tendencies','working_genius')),
  result jsonb not null,
  raw_answers jsonb not null,
  taken_at timestamptz default now(),
  unique (profile_id, assessment_type)
);

create index if not exists assessments_profile_idx on assessments(profile_id);

-- ============================================================================
-- PROSPECT RECOMMENDATIONS (the daily Power List)
-- ============================================================================
create table if not exists prospect_recommendations (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  contact_id uuid references contacts on delete cascade not null,
  surfaced_for_date date not null,
  rank int not null,
  reason text,
  hook text,
  signals jsonb default '{}'::jsonb,
  dismissed_at timestamptz,
  acted_on_at timestamptz,
  outcome text check (outcome in ('contacted','meeting_set','no_response','dead','converted')),
  created_at timestamptz default now()
);

create index if not exists prospect_recs_profile_date_idx on prospect_recommendations(profile_id, surfaced_for_date desc);
create index if not exists prospect_recs_contact_idx on prospect_recommendations(contact_id);

-- ============================================================================
-- ENRICHMENT JOBS (async social research queue)
-- ============================================================================
create table if not exists enrichment_jobs (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts on delete cascade not null,
  requested_by uuid references profiles on delete set null,
  platforms text[] default array['linkedin','facebook','instagram','web']::text[],
  status text default 'queued' check (status in ('queued','running','done','failed')),
  raw_data jsonb,
  summary text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists enrichment_jobs_status_idx on enrichment_jobs(status) where status in ('queued','running');
create index if not exists enrichment_jobs_contact_idx on enrichment_jobs(contact_id);

-- ============================================================================
-- DEFAULT PIPELINE STAGES (per org, created on org insert)
-- ============================================================================
create or replace function create_default_pipeline_stages()
returns trigger language plpgsql as $$
begin
  insert into pipeline_stages (org_id, name, board_type, display_order, color) values
    (new.id, 'Prospect',         'sales',   1, '#9CA3AF'),
    (new.id, 'Contacted',        'sales',   2, '#60A5FA'),
    (new.id, 'Appointment Set',  'sales',   3, '#FBBF24'),
    (new.id, 'FNA Complete',     'sales',   4, '#F97316'),
    (new.id, 'Client',           'sales',   5, '#38B249'),
    (new.id, 'Recruit Prospect', 'recruit', 1, '#9CA3AF'),
    (new.id, 'Interview Set',    'recruit', 2, '#60A5FA'),
    (new.id, 'Interview Done',   'recruit', 3, '#FBBF24'),
    (new.id, 'Licensed',         'recruit', 4, '#F97316'),
    (new.id, 'Active Partner',   'recruit', 5, '#38B249');
  return new;
end $$;

drop trigger if exists trg_create_default_pipeline_stages on organizations;
create trigger trg_create_default_pipeline_stages
  after insert on organizations
  for each row execute function create_default_pipeline_stages();

-- ============================================================================
-- POINTS AND STREAK MAINTENANCE
-- ============================================================================
create or replace function award_points_and_update_streak()
returns trigger language plpgsql as $$
declare
  v_today date := (new.awarded_at at time zone 'utc')::date;
  v_yesterday date := v_today - 1;
  v_last_active date;
begin
  -- upsert today's activity_log total
  insert into activity_log (profile_id, day, points_total)
    values (new.profile_id, v_today, new.points)
  on conflict (profile_id, day)
    do update set
      points_total = activity_log.points_total + excluded.points_total,
      updated_at = now();

  -- update streak
  select last_active_day into v_last_active from streaks where profile_id = new.profile_id;
  if v_last_active is null then
    insert into streaks (profile_id, current_streak, longest_streak, last_active_day)
      values (new.profile_id, 1, 1, v_today)
    on conflict (profile_id) do update set
      current_streak = 1, longest_streak = greatest(streaks.longest_streak, 1),
      last_active_day = v_today, updated_at = now();
  elsif v_last_active = v_today then
    -- already counted today, do nothing
    null;
  elsif v_last_active = v_yesterday then
    update streaks set
      current_streak = current_streak + 1,
      longest_streak = greatest(longest_streak, current_streak + 1),
      last_active_day = v_today,
      updated_at = now()
    where profile_id = new.profile_id;
  else
    update streaks set
      current_streak = 1, last_active_day = v_today, updated_at = now()
    where profile_id = new.profile_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_award_points on points_ledger;
create trigger trg_award_points
  after insert on points_ledger
  for each row execute function award_points_and_update_streak();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table organizations            enable row level security;
alter table profiles                 enable row level security;
alter table teams                    enable row level security;
alter table team_members             enable row level security;
alter table vision_board_items       enable row level security;
alter table weekly_goals             enable row level security;
alter table contacts                 enable row level security;
alter table producer_details         enable row level security;
alter table contact_events           enable row level security;
alter table activity_log             enable row level security;
alter table points_ledger            enable row level security;
alter table streaks                  enable row level security;
alter table pipeline_stages          enable row level security;
alter table pipeline_cards           enable row level security;
alter table pipeline_history         enable row level security;
alter table coach_sessions           enable row level security;
alter table coach_messages           enable row level security;
alter table assessments              enable row level security;
alter table prospect_recommendations enable row level security;
alter table enrichment_jobs          enable row level security;

-- Helper to get the caller's org
create or replace function auth_org_id() returns uuid
language sql stable as $$
  select org_id from profiles where id = auth.uid()
$$;

create or replace function auth_role() returns text
language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

-- ORGANIZATIONS: members see their own org, admins manage
drop policy if exists "org members read" on organizations;
create policy "org members read" on organizations
  for select using (id = auth_org_id());

-- PROFILES: see own profile + teammates in same org
drop policy if exists "profiles read same org" on profiles;
create policy "profiles read same org" on profiles
  for select using (org_id = auth_org_id());

drop policy if exists "profiles update self" on profiles;
create policy "profiles update self" on profiles
  for update using (id = auth.uid());

drop policy if exists "profiles insert self" on profiles;
create policy "profiles insert self" on profiles
  for insert with check (id = auth.uid());

-- TEAMS + TEAM MEMBERS: same org
drop policy if exists "teams read same org" on teams;
create policy "teams read same org" on teams for select using (org_id = auth_org_id());

drop policy if exists "team_members read same org" on team_members;
create policy "team_members read same org" on team_members for select using (
  team_id in (select id from teams where org_id = auth_org_id())
);

-- CONTACTS: owner full access, leaders read their team's contacts
drop policy if exists "contacts owner all" on contacts;
create policy "contacts owner all" on contacts for all using (profile_id = auth.uid());

drop policy if exists "contacts leader read" on contacts;
create policy "contacts leader read" on contacts for select using (
  org_id = auth_org_id() and auth_role() in ('leader','admin')
);

-- PRODUCER DETAILS: follows contact ownership
drop policy if exists "producer_details follows contact" on producer_details;
create policy "producer_details follows contact" on producer_details for all using (
  contact_id in (select id from contacts where profile_id = auth.uid())
  or contact_id in (select id from contacts where org_id = auth_org_id() and auth_role() in ('leader','admin'))
);

-- CONTACT EVENTS, ACTIVITY LOG, POINTS, STREAKS: owner access, leader read
drop policy if exists "contact_events owner all" on contact_events;
create policy "contact_events owner all" on contact_events for all using (profile_id = auth.uid());

drop policy if exists "contact_events leader read" on contact_events;
create policy "contact_events leader read" on contact_events for select using (
  profile_id in (select id from profiles where org_id = auth_org_id()) and auth_role() in ('leader','admin')
);

drop policy if exists "activity_log owner all" on activity_log;
create policy "activity_log owner all" on activity_log for all using (profile_id = auth.uid());

drop policy if exists "activity_log leader read" on activity_log;
create policy "activity_log leader read" on activity_log for select using (
  profile_id in (select id from profiles where org_id = auth_org_id())
);

drop policy if exists "points_ledger owner read" on points_ledger;
create policy "points_ledger owner read" on points_ledger for select using (profile_id = auth.uid());

drop policy if exists "streaks owner read" on streaks;
create policy "streaks owner read" on streaks for select using (profile_id = auth.uid());

drop policy if exists "streaks org read" on streaks;
create policy "streaks org read" on streaks for select using (
  profile_id in (select id from profiles where org_id = auth_org_id())
);

-- VISION BOARD + WEEKLY GOALS: owner only
drop policy if exists "vision owner all" on vision_board_items;
create policy "vision owner all" on vision_board_items for all using (profile_id = auth.uid());

drop policy if exists "weekly_goals owner all" on weekly_goals;
create policy "weekly_goals owner all" on weekly_goals for all using (profile_id = auth.uid());

-- PIPELINE: stages org-wide read, cards owner write, leader read
drop policy if exists "pipeline_stages org read" on pipeline_stages;
create policy "pipeline_stages org read" on pipeline_stages for select using (org_id = auth_org_id());

drop policy if exists "pipeline_cards owner all" on pipeline_cards;
create policy "pipeline_cards owner all" on pipeline_cards for all using (profile_id = auth.uid());

drop policy if exists "pipeline_cards leader read" on pipeline_cards;
create policy "pipeline_cards leader read" on pipeline_cards for select using (
  profile_id in (select id from profiles where org_id = auth_org_id()) and auth_role() in ('leader','admin')
);

drop policy if exists "pipeline_history read with card" on pipeline_history;
create policy "pipeline_history read with card" on pipeline_history for select using (
  card_id in (select id from pipeline_cards where profile_id = auth.uid())
);

-- COACH: owner only
drop policy if exists "coach_sessions owner all" on coach_sessions;
create policy "coach_sessions owner all" on coach_sessions for all using (profile_id = auth.uid());

drop policy if exists "coach_messages owner all" on coach_messages;
create policy "coach_messages owner all" on coach_messages for all using (
  session_id in (select id from coach_sessions where profile_id = auth.uid())
);

-- ASSESSMENTS: owner only
drop policy if exists "assessments owner all" on assessments;
create policy "assessments owner all" on assessments for all using (profile_id = auth.uid());

-- PROSPECT RECS: owner only
drop policy if exists "prospect_recs owner all" on prospect_recommendations;
create policy "prospect_recs owner all" on prospect_recommendations for all using (profile_id = auth.uid());

-- ENRICHMENT JOBS: owner read
drop policy if exists "enrichment_jobs owner all" on enrichment_jobs;
create policy "enrichment_jobs owner all" on enrichment_jobs for all using (
  contact_id in (select id from contacts where profile_id = auth.uid())
);

-- ============================================================================
-- DONE
-- ============================================================================
