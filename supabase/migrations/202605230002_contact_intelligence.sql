-- Contact Intelligence CSV Backend
-- Apply with: supabase db push

create extension if not exists pgcrypto;

-- =========================================================
-- Storage buckets
-- =========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('contact_imports', 'contact_imports', false, 52428800, array['text/csv', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream']),
  ('contact_exports', 'contact_exports', false, 52428800, array['text/csv', 'text/plain', 'application/octet-stream'])
on conflict (id) do nothing;

-- =========================================================
-- Helper trigger
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- Imports
-- =========================================================
create table if not exists public.contact_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Contact Import',
  default_goal text not null default 'life_insurance_partner',
  status text not null default 'created' check (status in (
    'created',
    'upload_url_created',
    'uploaded',
    'parsing',
    'parsed',
    'assessing',
    'assessed',
    'researching',
    'ready',
    'exporting',
    'failed'
  )),
  source_file_path text,
  original_filename text,
  mime_type text,
  total_rows integer not null default 0,
  parsed_rows integer not null default 0,
  failed_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  assessment_count integer not null default 0,
  researched_count integer not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_imports_user_id_idx on public.contact_imports(user_id);
create index if not exists contact_imports_status_idx on public.contact_imports(status);

drop trigger if exists contact_imports_set_updated_at on public.contact_imports;
create trigger contact_imports_set_updated_at
before update on public.contact_imports
for each row execute function public.set_updated_at();

-- =========================================================
-- Column mapping
-- =========================================================
create table if not exists public.contact_import_column_mappings (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.contact_imports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  detected_mapping jsonb not null default '{}'::jsonb,
  user_mapping jsonb not null default '{}'::jsonb,
  unmapped_headers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(import_id)
);

drop trigger if exists contact_import_column_mappings_set_updated_at on public.contact_import_column_mappings;
create trigger contact_import_column_mappings_set_updated_at
before update on public.contact_import_column_mappings
for each row execute function public.set_updated_at();

-- =========================================================
-- Contact records
-- =========================================================
create table if not exists public.contact_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.contact_imports(id) on delete cascade,
  row_number integer not null,
  original_row jsonb not null default '{}'::jsonb,

  -- Raw fields
  raw_full_name text,
  raw_first_name text,
  raw_last_name text,
  raw_phone text,
  raw_email text,
  raw_company text,
  raw_job_title text,
  raw_notes text,

  -- Normalized contact identity
  first_name text,
  last_name text,
  full_name text,
  email text,
  phone text,
  phone_e164 text,
  city text,
  state text,
  zip text,
  company text,
  job_title text,
  occupation text,
  contact_type text,
  follow_up_date date,
  notes text,

  -- User supplied organizational fields
  gender_label text default 'not_provided' check (gender_label in ('man', 'woman', 'nonbinary', 'other', 'unknown', 'not_provided')),
  original_gender_label text,
  gender_source text default 'not_provided' check (gender_source in ('csv', 'manual', 'self_stated_note', 'not_provided')),
  married_status text default 'unknown' check (married_status in ('yes', 'no', 'unknown', 'not_provided')),
  homeowner_status text default 'unknown' check (homeowner_status in ('yes', 'no', 'unknown', 'not_provided')),

  -- User supplied social links
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  website_url text,

  -- Consent and suppression
  email_opt_out boolean not null default false,
  sms_opt_out boolean not null default false,
  do_not_contact boolean not null default false,
  consent_source text,

  -- Import status
  dedupe_key text,
  duplicate_of_contact_id uuid references public.contact_records(id),
  parse_status text not null default 'parsed' check (parse_status in ('parsed', 'failed', 'duplicate', 'needs_review')),
  research_status text not null default 'not_started' check (research_status in ('not_started', 'queued', 'researching', 'complete', 'failed', 'skipped')),
  assessment_status text not null default 'not_started' check (assessment_status in ('not_started', 'queued', 'assessing', 'complete', 'failed', 'skipped')),
  normalization_errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(import_id, row_number)
);

create index if not exists contact_records_user_id_idx on public.contact_records(user_id);
create index if not exists contact_records_import_id_idx on public.contact_records(import_id);
create index if not exists contact_records_email_idx on public.contact_records(email);
create index if not exists contact_records_phone_e164_idx on public.contact_records(phone_e164);
create index if not exists contact_records_dedupe_key_idx on public.contact_records(dedupe_key);
create index if not exists contact_records_gender_label_idx on public.contact_records(gender_label);
create index if not exists contact_records_research_status_idx on public.contact_records(research_status);
create index if not exists contact_records_assessment_status_idx on public.contact_records(assessment_status);

drop trigger if exists contact_records_set_updated_at on public.contact_records;
create trigger contact_records_set_updated_at
before update on public.contact_records
for each row execute function public.set_updated_at();

-- =========================================================
-- Social profiles and enrichment sources
-- =========================================================
create table if not exists public.contact_social_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.contact_imports(id) on delete cascade,
  contact_id uuid not null references public.contact_records(id) on delete cascade,
  platform text not null check (platform in ('linkedin', 'facebook', 'instagram', 'website', 'x', 'youtube', 'other')),
  profile_url text not null,
  display_name text,
  headline text,
  company text,
  source_type text not null default 'csv' check (source_type in ('csv', 'manual', 'public_search', 'provider_api')),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contact_social_profiles_contact_id_idx on public.contact_social_profiles(contact_id);
create index if not exists contact_social_profiles_platform_idx on public.contact_social_profiles(platform);

create table if not exists public.contact_enrichment_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.contact_imports(id) on delete cascade,
  contact_id uuid not null references public.contact_records(id) on delete cascade,
  provider text not null default 'manual',
  source_type text not null default 'public_search' check (source_type in ('csv', 'manual', 'public_search', 'provider_api', 'openai_web_search')),
  query text,
  title text,
  snippet text,
  url text,
  retrieved_at timestamptz not null default now(),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contact_enrichment_sources_contact_id_idx on public.contact_enrichment_sources(contact_id);
create index if not exists contact_enrichment_sources_url_idx on public.contact_enrichment_sources(url);

-- =========================================================
-- AI assessments
-- =========================================================
create table if not exists public.contact_ai_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.contact_imports(id) on delete cascade,
  contact_id uuid not null references public.contact_records(id) on delete cascade,

  captive_status text not null default 'unknown' check (captive_status in ('captive_agent', 'non_captive_independent', 'not_insurance', 'unknown')),
  candidate_type text not null default 'manual_review' check (candidate_type in (
    'life_insurance_partner',
    'financial_educator',
    'referral_partner',
    'client_prospect',
    'nurture',
    'not_a_fit',
    'manual_review'
  )),
  persona_segment text,
  priority_tier text not null default 'MANUAL_REVIEW' check (priority_tier in ('A', 'B', 'C', 'NURTURE', 'MANUAL_REVIEW', 'DO_NOT_CONTACT')),

  life_insurance_partner_score integer not null default 0 check (life_insurance_partner_score >= 0 and life_insurance_partner_score <= 100),
  financial_educator_score integer not null default 0 check (financial_educator_score >= 0 and financial_educator_score <= 100),
  client_prospect_score integer not null default 0 check (client_prospect_score >= 0 and client_prospect_score <= 100),
  referral_partner_score integer not null default 0 check (referral_partner_score >= 0 and referral_partner_score <= 100),

  next_best_action text,
  suggested_message_angle text,
  evidence_summary text,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  protected_class_used boolean not null default false,
  manual_review_required boolean not null default true,
  missing_data jsonb not null default '[]'::jsonb,
  compliance_flags jsonb not null default '[]'::jsonb,
  source_urls jsonb not null default '[]'::jsonb,
  assessment_json jsonb not null default '{}'::jsonb,
  model_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contact_id)
);

create index if not exists contact_ai_assessments_user_id_idx on public.contact_ai_assessments(user_id);
create index if not exists contact_ai_assessments_import_id_idx on public.contact_ai_assessments(import_id);
create index if not exists contact_ai_assessments_candidate_type_idx on public.contact_ai_assessments(candidate_type);
create index if not exists contact_ai_assessments_captive_status_idx on public.contact_ai_assessments(captive_status);
create index if not exists contact_ai_assessments_priority_tier_idx on public.contact_ai_assessments(priority_tier);

drop trigger if exists contact_ai_assessments_set_updated_at on public.contact_ai_assessments;
create trigger contact_ai_assessments_set_updated_at
before update on public.contact_ai_assessments
for each row execute function public.set_updated_at();

-- =========================================================
-- Jobs and events
-- =========================================================
create table if not exists public.contact_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid references public.contact_imports(id) on delete cascade,
  contact_id uuid references public.contact_records(id) on delete cascade,
  job_type text not null check (job_type in ('parse_csv', 'assess_import_contacts', 'research_contacts', 'export_csv', 'assess_single_contact')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed', 'retry', 'cancelled')),
  priority integer not null default 0,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  payload jsonb not null default '{}'::jsonb,
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_jobs_status_idx on public.contact_jobs(status);
create index if not exists contact_jobs_import_id_idx on public.contact_jobs(import_id);
create index if not exists contact_jobs_user_id_idx on public.contact_jobs(user_id);
create index if not exists contact_jobs_claim_idx on public.contact_jobs(status, priority desc, created_at asc);

drop trigger if exists contact_jobs_set_updated_at on public.contact_jobs;
create trigger contact_jobs_set_updated_at
before update on public.contact_jobs
for each row execute function public.set_updated_at();

create table if not exists public.contact_job_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_id uuid references public.contact_jobs(id) on delete cascade,
  import_id uuid references public.contact_imports(id) on delete cascade,
  contact_id uuid references public.contact_records(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contact_job_events_job_id_idx on public.contact_job_events(job_id);
create index if not exists contact_job_events_import_id_idx on public.contact_job_events(import_id);

-- =========================================================
-- Exports and audit
-- =========================================================
create table if not exists public.contact_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  import_id uuid not null references public.contact_imports(id) on delete cascade,
  export_type text not null default 'organized_csv' check (export_type in ('organized_csv', 'research_csv', 'full_audit_csv')),
  file_path text not null,
  row_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists contact_exports_import_id_idx on public.contact_exports(import_id);

create table if not exists public.contact_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  import_id uuid references public.contact_imports(id) on delete cascade,
  contact_id uuid references public.contact_records(id) on delete cascade,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- Job functions
-- =========================================================
create or replace function public.claim_next_contact_job(worker_name text default 'edge-worker')
returns setof public.contact_jobs
language plpgsql
security definer
as $$
begin
  return query
  with picked as (
    select id
    from public.contact_jobs
    where status in ('queued', 'retry')
      and attempts < max_attempts
      and (locked_at is null or locked_at < now() - interval '15 minutes')
    order by priority desc, created_at asc
    limit 1
    for update skip locked
  )
  update public.contact_jobs j
  set status = 'processing',
      locked_at = now(),
      locked_by = worker_name,
      attempts = attempts + 1,
      started_at = coalesce(started_at, now()),
      updated_at = now()
  from picked
  where j.id = picked.id
  returning j.*;
end;
$$;

create or replace function public.log_contact_job_event(
  p_job_id uuid,
  p_import_id uuid,
  p_contact_id uuid,
  p_user_id uuid,
  p_event_type text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_id uuid;
begin
  insert into public.contact_job_events(job_id, import_id, contact_id, user_id, event_type, message, metadata)
  values (p_job_id, p_import_id, p_contact_id, p_user_id, p_event_type, p_message, coalesce(p_metadata, '{}'::jsonb))
  returning id into new_id;
  return new_id;
end;
$$;

-- =========================================================
-- RLS
-- =========================================================
alter table public.contact_imports enable row level security;
alter table public.contact_import_column_mappings enable row level security;
alter table public.contact_records enable row level security;
alter table public.contact_social_profiles enable row level security;
alter table public.contact_enrichment_sources enable row level security;
alter table public.contact_ai_assessments enable row level security;
alter table public.contact_jobs enable row level security;
alter table public.contact_job_events enable row level security;
alter table public.contact_exports enable row level security;
alter table public.contact_audit_log enable row level security;

-- Drop before create pattern for repeatable local dev
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'contact_imports',
        'contact_import_column_mappings',
        'contact_records',
        'contact_social_profiles',
        'contact_enrichment_sources',
        'contact_ai_assessments',
        'contact_jobs',
        'contact_job_events',
        'contact_exports',
        'contact_audit_log'
      )
  ) LOOP
    EXECUTE format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

create policy contact_imports_owner_all on public.contact_imports
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_import_column_mappings_owner_all on public.contact_import_column_mappings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_records_owner_all on public.contact_records
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_social_profiles_owner_all on public.contact_social_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_enrichment_sources_owner_all on public.contact_enrichment_sources
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_ai_assessments_owner_all on public.contact_ai_assessments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_jobs_owner_all on public.contact_jobs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_job_events_owner_all on public.contact_job_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_exports_owner_all on public.contact_exports
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy contact_audit_log_owner_all on public.contact_audit_log
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage policies for authenticated owners.
-- File path convention: {user_id}/{import_id}/{filename}
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'contact_imports_owner_read',
        'contact_imports_owner_insert',
        'contact_imports_owner_update',
        'contact_exports_owner_read',
        'contact_exports_owner_insert'
      )
  ) LOOP
    EXECUTE format('drop policy if exists %I on storage.objects', r.policyname);
  END LOOP;
END $$;

create policy contact_imports_owner_read on storage.objects
for select using (
  bucket_id = 'contact_imports'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy contact_imports_owner_insert on storage.objects
for insert with check (
  bucket_id = 'contact_imports'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy contact_imports_owner_update on storage.objects
for update using (
  bucket_id = 'contact_imports'
  and auth.uid()::text = (storage.foldername(name))[1]
) with check (
  bucket_id = 'contact_imports'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy contact_exports_owner_read on storage.objects
for select using (
  bucket_id = 'contact_exports'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy contact_exports_owner_insert on storage.objects
for insert with check (
  bucket_id = 'contact_exports'
  and auth.uid()::text = (storage.foldername(name))[1]
);
