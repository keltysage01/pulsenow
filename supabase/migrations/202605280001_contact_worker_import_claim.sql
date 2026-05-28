create or replace function public.claim_next_contact_job_for_import(
  worker_name text default 'edge-worker',
  target_import_id uuid default null
)
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
      and (target_import_id is null or import_id = target_import_id)
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
