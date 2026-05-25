-- Dream Life Builder core schema
-- Apply this migration in Supabase SQL editor or with supabase db push.

create extension if not exists pgcrypto;

create schema if not exists private;

-- Storage bucket for private generated and uploaded assets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dream_life_assets',
  'dream_life_assets',
  false,
  52428800,
  array[
    'audio/mpeg',
    'audio/mp4',
    'audio/mp3',
    'audio/m4a',
    'audio/wav',
    'audio/webm',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'image/svg+xml',
    'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  default_tone_mode text not null default 'faith_centered',
  default_visual_style text not null default 'future_by_design',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My Dream Life Map',
  status text not null default 'created',
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  current_step text,
  current_message text,
  tone_mode text not null default 'faith_centered',
  visual_style text not null default 'future_by_design',
  input_mode text not null default 'voice_or_text',
  center_declaration text,
  future_self_summary text,
  overall_feeling_words jsonb not null default '[]'::jsonb,
  missing_information jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  last_error text,
  build_started_at timestamptz,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_inputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('audio', 'text', 'wispr_transcript')),
  voice_provider text check (voice_provider in ('wispr', 'openai', 'native_browser', 'manual_text', 'unknown')),
  audio_storage_path text,
  audio_mime_type text,
  audio_size_bytes bigint,
  raw_text text,
  transcript_text text,
  transcript_provider text,
  transcript_metadata jsonb not null default '{}'::jsonb,
  language text,
  duration_seconds integer,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_profiles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_json jsonb not null,
  center_declaration text,
  future_self_summary text,
  safety_notes jsonb not null default '[]'::jsonb,
  missing_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_categories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_key text not null,
  display_name text not null,
  desire_statement text,
  present_tense_declaration text,
  feeling_words jsonb not null default '[]'::jsonb,
  visual_keywords jsonb not null default '[]'::jsonb,
  image_prompt_seed text,
  final_image_prompt text,
  aligned_actions jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  certainty_score numeric not null default 0 check (certainty_score >= 0 and certainty_score <= 1),
  is_visible boolean not null default true,
  user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, category_key)
);

create table if not exists public.dream_assets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category_key text,
  asset_kind text not null check (asset_kind in ('audio_input', 'category_image', 'sheet_png', 'sheet_pdf', 'sheet_svg', 'sheet_json', 'reference_image')),
  storage_bucket text not null default 'dream_life_assets',
  storage_path text not null,
  signed_url text,
  signed_url_expires_at timestamptz,
  content_type text,
  width integer,
  height integer,
  prompt_text text,
  provider_name text,
  provider_asset_id text,
  generation_status text not null default 'created',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_sheets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  template_name text not null default 'future_by_design_letter_grid',
  sheet_json jsonb not null default '{}'::jsonb,
  sheet_svg_storage_path text,
  sheet_png_storage_path text,
  sheet_pdf_storage_path text,
  preview_image_storage_path text,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  priority integer not null default 100,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dream_job_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.dream_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.dream_jobs(id) on delete set null,
  event_type text not null default 'info',
  status text,
  progress_percent integer check (progress_percent >= 0 and progress_percent <= 100),
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dream_usage_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.dream_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  provider_name text not null,
  operation text not null,
  model_name text,
  input_units numeric,
  output_units numeric,
  estimated_cost_usd numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dream_sessions_user_id_created_at on public.dream_sessions(user_id, created_at desc);
create index if not exists idx_dream_inputs_session_id on public.dream_inputs(session_id);
create index if not exists idx_dream_categories_session_id_sort on public.dream_categories(session_id, sort_order);
create index if not exists idx_dream_assets_session_kind on public.dream_assets(session_id, asset_kind);
create index if not exists idx_dream_jobs_queue on public.dream_jobs(status, available_at, priority, created_at);
create index if not exists idx_dream_job_events_session_created on public.dream_job_events(session_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_dream_sessions_updated_at on public.dream_sessions;
create trigger set_dream_sessions_updated_at before update on public.dream_sessions for each row execute function public.set_updated_at();

drop trigger if exists set_dream_inputs_updated_at on public.dream_inputs;
create trigger set_dream_inputs_updated_at before update on public.dream_inputs for each row execute function public.set_updated_at();

drop trigger if exists set_dream_profiles_updated_at on public.dream_profiles;
create trigger set_dream_profiles_updated_at before update on public.dream_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_dream_categories_updated_at on public.dream_categories;
create trigger set_dream_categories_updated_at before update on public.dream_categories for each row execute function public.set_updated_at();

drop trigger if exists set_dream_assets_updated_at on public.dream_assets;
create trigger set_dream_assets_updated_at before update on public.dream_assets for each row execute function public.set_updated_at();

drop trigger if exists set_dream_sheets_updated_at on public.dream_sheets;
create trigger set_dream_sheets_updated_at before update on public.dream_sheets for each row execute function public.set_updated_at();

drop trigger if exists set_dream_jobs_updated_at on public.dream_jobs;
create trigger set_dream_jobs_updated_at before update on public.dream_jobs for each row execute function public.set_updated_at();

-- Job helper. Service role calls this from Edge Functions.
create or replace function public.enqueue_dream_job(
  p_session_id uuid,
  p_user_id uuid,
  p_job_type text,
  p_payload jsonb default '{}'::jsonb,
  p_priority integer default 100,
  p_available_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  insert into public.dream_jobs(session_id, user_id, job_type, payload, priority, available_at)
  values (p_session_id, p_user_id, p_job_type, coalesce(p_payload, '{}'::jsonb), p_priority, p_available_at)
  returning id into v_job_id;

  return v_job_id;
end;
$$;

create or replace function public.claim_next_dream_job(p_worker_id text)
returns public.dream_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.dream_jobs;
begin
  select * into v_job
  from public.dream_jobs
  where status = 'queued'
    and available_at <= now()
    and attempts < max_attempts
  order by priority asc, created_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.dream_jobs
  set status = 'running',
      attempts = attempts + 1,
      locked_by = p_worker_id,
      locked_at = now(),
      started_at = coalesce(started_at, now())
  where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

create or replace function public.release_dream_job_success(p_job_id uuid, p_result jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dream_jobs
  set status = 'succeeded',
      result = coalesce(p_result, '{}'::jsonb),
      completed_at = now(),
      error_code = null,
      error_message = null
  where id = p_job_id;
end;
$$;

create or replace function public.release_dream_job_failure(
  p_job_id uuid,
  p_error_code text,
  p_error_message text,
  p_retry boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.dream_jobs;
begin
  select * into v_job from public.dream_jobs where id = p_job_id;

  if not found then
    return;
  end if;

  if p_retry and v_job.attempts < v_job.max_attempts then
    update public.dream_jobs
    set status = 'queued',
        available_at = now() + make_interval(secs => least(300, power(2, attempts)::int * 15)),
        locked_by = null,
        locked_at = null,
        error_code = p_error_code,
        error_message = p_error_message
    where id = p_job_id;
  else
    update public.dream_jobs
    set status = 'failed',
        completed_at = now(),
        error_code = p_error_code,
        error_message = p_error_message
    where id = p_job_id;
  end if;
end;
$$;

create or replace function public.log_dream_event(
  p_session_id uuid,
  p_user_id uuid,
  p_job_id uuid,
  p_event_type text,
  p_status text,
  p_progress_percent integer,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.dream_job_events(
    session_id, user_id, job_id, event_type, status, progress_percent, message, metadata
  )
  values (
    p_session_id, p_user_id, p_job_id, p_event_type, p_status, p_progress_percent, p_message, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  update public.dream_sessions
  set status = coalesce(p_status, status),
      progress_percent = coalesce(p_progress_percent, progress_percent),
      current_message = coalesce(p_message, current_message),
      current_step = p_event_type
  where id = p_session_id;

  return v_event_id;
end;
$$;

-- Row level security.
alter table public.user_profiles enable row level security;
alter table public.dream_sessions enable row level security;
alter table public.dream_inputs enable row level security;
alter table public.dream_profiles enable row level security;
alter table public.dream_categories enable row level security;
alter table public.dream_assets enable row level security;
alter table public.dream_sheets enable row level security;
alter table public.dream_jobs enable row level security;
alter table public.dream_job_events enable row level security;
alter table public.dream_usage_events enable row level security;

drop policy if exists "profiles_select_own" on public.user_profiles;
drop policy if exists "profiles_update_own" on public.user_profiles;
drop policy if exists "profiles_insert_own" on public.user_profiles;
drop policy if exists "dream_sessions_select_own" on public.dream_sessions;
drop policy if exists "dream_sessions_insert_own" on public.dream_sessions;
drop policy if exists "dream_sessions_update_own_safe" on public.dream_sessions;
drop policy if exists "dream_inputs_select_own" on public.dream_inputs;
drop policy if exists "dream_inputs_insert_own" on public.dream_inputs;
drop policy if exists "dream_inputs_update_own" on public.dream_inputs;
drop policy if exists "dream_profiles_select_own" on public.dream_profiles;
drop policy if exists "dream_categories_select_own" on public.dream_categories;
drop policy if exists "dream_categories_update_own" on public.dream_categories;
drop policy if exists "dream_assets_select_own" on public.dream_assets;
drop policy if exists "dream_sheets_select_own" on public.dream_sheets;
drop policy if exists "dream_jobs_select_own" on public.dream_jobs;
drop policy if exists "dream_events_select_own" on public.dream_job_events;
drop policy if exists "dream_usage_select_own" on public.dream_usage_events;

create policy "profiles_select_own" on public.user_profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.user_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.user_profiles for insert to authenticated with check (id = auth.uid());

create policy "dream_sessions_select_own" on public.dream_sessions for select to authenticated using (user_id = auth.uid() and deleted_at is null);
create policy "dream_sessions_insert_own" on public.dream_sessions for insert to authenticated with check (user_id = auth.uid());
create policy "dream_sessions_update_own_safe" on public.dream_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "dream_inputs_select_own" on public.dream_inputs for select to authenticated using (user_id = auth.uid());
create policy "dream_inputs_insert_own" on public.dream_inputs for insert to authenticated with check (user_id = auth.uid());
create policy "dream_inputs_update_own" on public.dream_inputs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "dream_profiles_select_own" on public.dream_profiles for select to authenticated using (user_id = auth.uid());
create policy "dream_categories_select_own" on public.dream_categories for select to authenticated using (user_id = auth.uid());
create policy "dream_categories_update_own" on public.dream_categories for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dream_assets_select_own" on public.dream_assets for select to authenticated using (user_id = auth.uid());
create policy "dream_sheets_select_own" on public.dream_sheets for select to authenticated using (user_id = auth.uid());
create policy "dream_jobs_select_own" on public.dream_jobs for select to authenticated using (user_id = auth.uid());
create policy "dream_events_select_own" on public.dream_job_events for select to authenticated using (user_id = auth.uid());
create policy "dream_usage_select_own" on public.dream_usage_events for select to authenticated using (user_id = auth.uid());

-- Storage RLS. Paths must be user_id/session_id/filename.ext.
drop policy if exists "dream_assets_storage_read_own" on storage.objects;
drop policy if exists "dream_assets_storage_insert_own" on storage.objects;
drop policy if exists "dream_assets_storage_update_own" on storage.objects;
drop policy if exists "dream_assets_storage_delete_own" on storage.objects;

create policy "dream_assets_storage_read_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'dream_life_assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "dream_assets_storage_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'dream_life_assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "dream_assets_storage_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'dream_life_assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'dream_life_assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "dream_assets_storage_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'dream_life_assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Execute permissions for service role helpers.
revoke all on function public.claim_next_dream_job(text) from public, anon, authenticated;
revoke all on function public.release_dream_job_success(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.release_dream_job_failure(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.enqueue_dream_job(uuid, uuid, text, jsonb, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.log_dream_event(uuid, uuid, uuid, text, text, integer, text, jsonb) from public, anon, authenticated;

grant execute on function public.claim_next_dream_job(text) to service_role;
grant execute on function public.release_dream_job_success(uuid, jsonb) to service_role;
grant execute on function public.release_dream_job_failure(uuid, text, text, boolean) to service_role;
grant execute on function public.enqueue_dream_job(uuid, uuid, text, jsonb, integer, timestamptz) to service_role;
grant execute on function public.log_dream_event(uuid, uuid, uuid, text, text, integer, text, jsonb) to service_role;
