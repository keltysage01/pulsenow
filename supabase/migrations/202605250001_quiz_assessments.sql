-- ============================================================================
-- Pulsenow Quiz Assessments
-- Working Genius + Four Tendencies storage, result snapshots, and team rollups.
-- Idempotent: safe to re-run.
-- ============================================================================

create extension if not exists "uuid-ossp";

create table if not exists quiz_attempts (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  org_id uuid references organizations on delete cascade not null,
  team_id uuid references teams on delete set null,
  quiz_type text not null check (quiz_type in ('working_genius','four_tendencies')),
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  answers jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists quiz_attempts_profile_type_idx on quiz_attempts(profile_id, quiz_type, updated_at desc);
create index if not exists quiz_attempts_org_team_idx on quiz_attempts(org_id, team_id, quiz_type);
create index if not exists quiz_attempts_result_gin_idx on quiz_attempts using gin (result);

create table if not exists quiz_profiles (
  profile_id uuid primary key references profiles on delete cascade,
  org_id uuid references organizations on delete cascade not null,
  working_genius_result jsonb,
  four_tendencies_result jsonb,
  combined_profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists quiz_profiles_org_idx on quiz_profiles(org_id);
create index if not exists quiz_profiles_combined_gin_idx on quiz_profiles using gin (combined_profile);

create table if not exists coach_feed_cards (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles on delete cascade not null,
  card_type text not null check (card_type in ('quiz_profile','weekly_insight','team_gap','general')),
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  surfaced_for_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists coach_feed_cards_profile_date_idx on coach_feed_cards(profile_id, surfaced_for_date desc);

create or replace function touch_quiz_attempts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_quiz_attempts on quiz_attempts;
create trigger trg_touch_quiz_attempts
  before update on quiz_attempts
  for each row execute function touch_quiz_attempts_updated_at();

create or replace function sync_quiz_profile_from_attempt()
returns trigger language plpgsql as $$
declare
  v_combined jsonb := '{}'::jsonb;
  v_wg jsonb;
  v_ft jsonb;
begin
  if new.status <> 'completed' then
    return new;
  end if;

  insert into quiz_profiles (profile_id, org_id, working_genius_result, four_tendencies_result, combined_profile)
  values (
    new.profile_id,
    new.org_id,
    case when new.quiz_type = 'working_genius' then new.result else null end,
    case when new.quiz_type = 'four_tendencies' then new.result else null end,
    '{}'::jsonb
  )
  on conflict (profile_id) do update set
    org_id = excluded.org_id,
    working_genius_result = case
      when new.quiz_type = 'working_genius' then new.result
      else quiz_profiles.working_genius_result
    end,
    four_tendencies_result = case
      when new.quiz_type = 'four_tendencies' then new.result
      else quiz_profiles.four_tendencies_result
    end,
    updated_at = now();

  select working_genius_result, four_tendencies_result
    into v_wg, v_ft
  from quiz_profiles
  where profile_id = new.profile_id;

  v_combined = jsonb_build_object(
    'working_genius_primary', v_wg #>> '{workingGenius,0}',
    'working_genius_secondary', v_wg #>> '{workingGenius,1}',
    'working_frustrations', coalesce(v_wg->'workingFrustrations', '[]'::jsonb),
    'tendency', v_ft->>'primaryTendency',
    'completed', jsonb_build_object(
      'working_genius', v_wg is not null,
      'four_tendencies', v_ft is not null
    )
  );

  update quiz_profiles
  set combined_profile = v_combined, updated_at = now()
  where profile_id = new.profile_id;

  return new;
end $$;

drop trigger if exists trg_sync_quiz_profile_from_attempt on quiz_attempts;
create trigger trg_sync_quiz_profile_from_attempt
  after insert or update of status, result on quiz_attempts
  for each row execute function sync_quiz_profile_from_attempt();

create or replace view team_quiz_aggregates as
select
  t.id as team_id,
  t.org_id,
  t.name as team_name,
  count(qp.profile_id) filter (where qp.working_genius_result is not null or qp.four_tendencies_result is not null) as members_with_any_result,
  count(qp.profile_id) filter (where qp.working_genius_result is not null) as members_with_working_genius,
  count(qp.profile_id) filter (where qp.four_tendencies_result is not null) as members_with_four_tendencies,
  jsonb_build_object(
    'wonder', count(*) filter (where qp.working_genius_result->'workingGenius' ? 'wonder'),
    'invention', count(*) filter (where qp.working_genius_result->'workingGenius' ? 'invention'),
    'discernment', count(*) filter (where qp.working_genius_result->'workingGenius' ? 'discernment'),
    'galvanizing', count(*) filter (where qp.working_genius_result->'workingGenius' ? 'galvanizing'),
    'enablement', count(*) filter (where qp.working_genius_result->'workingGenius' ? 'enablement'),
    'tenacity', count(*) filter (where qp.working_genius_result->'workingGenius' ? 'tenacity')
  ) as working_genius_counts,
  jsonb_build_object(
    'upholder', count(*) filter (where qp.four_tendencies_result->>'primaryTendency' = 'upholder'),
    'questioner', count(*) filter (where qp.four_tendencies_result->>'primaryTendency' = 'questioner'),
    'obliger', count(*) filter (where qp.four_tendencies_result->>'primaryTendency' = 'obliger'),
    'rebel', count(*) filter (where qp.four_tendencies_result->>'primaryTendency' = 'rebel')
  ) as tendency_counts,
  jsonb_strip_nulls(jsonb_build_object(
    'no_wonder', case when count(*) filter (where qp.working_genius_result->'workingGenius' ? 'wonder') = 0 then 'No one is naturally carrying early-stage questioning. Add explicit discovery time before committing.' end,
    'no_invention', case when count(*) filter (where qp.working_genius_result->'workingGenius' ? 'invention') = 0 then 'The team may recycle old plays. Assign someone to generate new options.' end,
    'no_discernment', case when count(*) filter (where qp.working_genius_result->'workingGenius' ? 'discernment') = 0 then 'Ideas may move forward without enough gut-checking. Create a review step.' end,
    'no_galvanizing', case when count(*) filter (where qp.working_genius_result->'workingGenius' ? 'galvanizing') = 0 then 'Momentum may stall after planning. Name one owner to rally next actions.' end,
    'no_enablement', case when count(*) filter (where qp.working_genius_result->'workingGenius' ? 'enablement') = 0 then 'Support work may be assumed instead of owned. Make help requests direct.' end,
    'no_tenacity', case when count(*) filter (where qp.working_genius_result->'workingGenius' ? 'tenacity') = 0 then 'Follow-through is a likely gap. Add close-the-loop checkpoints and deadlines.' end
  )) as gap_messages
from teams t
left join team_members tm on tm.team_id = t.id
left join quiz_profiles qp on qp.profile_id = tm.profile_id
group by t.id, t.org_id, t.name;

alter table quiz_attempts enable row level security;
alter table quiz_profiles enable row level security;
alter table coach_feed_cards enable row level security;

drop policy if exists "quiz_attempts owner all" on quiz_attempts;
create policy "quiz_attempts owner all" on quiz_attempts for all using (profile_id = auth.uid());

drop policy if exists "quiz_attempts leader read" on quiz_attempts;
create policy "quiz_attempts leader read" on quiz_attempts for select using (
  org_id = auth_org_id() and auth_role() in ('leader','admin')
);

drop policy if exists "quiz_profiles owner read" on quiz_profiles;
create policy "quiz_profiles owner read" on quiz_profiles for select using (profile_id = auth.uid());

drop policy if exists "quiz_profiles leader read" on quiz_profiles;
create policy "quiz_profiles leader read" on quiz_profiles for select using (
  org_id = auth_org_id() and auth_role() in ('leader','admin')
);

drop policy if exists "coach_feed_cards owner all" on coach_feed_cards;
create policy "coach_feed_cards owner all" on coach_feed_cards for all using (profile_id = auth.uid());

-- ============================================================================
-- DONE
-- ============================================================================
