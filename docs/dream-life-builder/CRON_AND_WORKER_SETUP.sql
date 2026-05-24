-- Optional Supabase Cron setup.
-- Enable pg_cron and pg_net in Supabase dashboard first.
-- Store DREAM_WORKER_SECRET in Supabase Vault if you use Vault.
-- Replace project ref and secret.

-- This schedules the worker every minute.
-- You can run it more often in production if your plan supports it.

select cron.schedule(
  'dream-life-builder-worker-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/dream_worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY',
      'x-dream-worker-secret', 'YOUR_DREAM_WORKER_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- For local development you can call:
-- curl -X POST http://127.0.0.1:54321/functions/v1/dream_worker -H "x-dream-worker-secret: your_secret"
