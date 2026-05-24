# Deployment Checklist

## Supabase setup

1. Create or open the Supabase project.
2. Confirm Auth is enabled.
3. Apply `supabase/migrations/202605230001_dream_life_builder.sql`.
4. Confirm `dream_life_assets` bucket exists and is private.
5. Confirm RLS is enabled on all Dream Life Builder tables.
6. Add Edge Function secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk_your_key
supabase secrets set OPENAI_TEXT_MODEL=gpt-5.5
supabase secrets set OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe
supabase secrets set OPENAI_IMAGE_MODEL=gpt-image-2
supabase secrets set DREAM_ASSETS_BUCKET=dream_life_assets
supabase secrets set DREAM_WORKER_SECRET=long_random_secret
supabase secrets set WISPR_ENABLED=false
```

7. Deploy Edge Functions:

```bash
supabase functions deploy dream_create_session
supabase functions deploy dream_create_upload_url
supabase functions deploy dream_submit_input
supabase functions deploy dream_start_build
supabase functions deploy dream_get_session
supabase functions deploy dream_regenerate_image
supabase functions deploy dream_worker
```

## Frontend setup

1. Add `NEXT_PUBLIC_SUPABASE_URL`.
2. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Add Supabase client.
4. Add Dream Builder page.
5. Add recorder, progress, and sheet viewer components.
6. Add a signed in user requirement.
7. Add error states.
8. Add a text input fallback.

## Worker setup

Development command:

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/dream_worker" \
  -H "x-dream-worker-secret: your_secret" \
  -H "Authorization: Bearer your_anon_or_service_key"
```

Production options:

1. Supabase Cron calls the worker every minute.
2. GitHub Actions scheduled workflow calls the worker.
3. Vercel Cron calls the worker.
4. Admin button calls the worker during development.

## Wispr setup

Wispr should be optional.

Use `NEXT_PUBLIC_ENABLE_WISPR=true` and `WISPR_ENABLED=true` only after API access is confirmed.

For the most reliable launch, support this path first:

1. User records audio in browser.
2. Audio uploads to Supabase Storage.
3. Worker transcribes with OpenAI.
4. User can also paste transcript from Wispr Flow manually.

Then add live Wispr WebSocket capture later.

## Production safety

1. Do not expose service role key.
2. Use private storage buckets.
3. Use signed URLs for asset previews.
4. Set max generated images per session.
5. Add monthly user quota before launch if image cost matters.
6. Add retry handling for failed jobs.
7. Add a support message if content is blocked by image moderation.
8. Store prompts and provider metadata for debugging.
9. Add delete session feature for user privacy.
10. Add export data feature later if desired.
