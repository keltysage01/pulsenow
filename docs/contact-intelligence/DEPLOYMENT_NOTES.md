# Contact Intelligence Deployment Notes

## Required Supabase work

Apply the migration:

```bash
supabase db push
```

Deploy these Edge Functions:

```bash
supabase functions deploy contacts_create_import
supabase functions deploy contacts_create_upload_url
supabase functions deploy contacts_submit_csv
supabase functions deploy contacts_worker --no-verify-jwt
supabase functions deploy contacts_get_import
supabase functions deploy contacts_research_batch
supabase functions deploy contacts_export_csv
supabase functions deploy contacts_update_contact
```

## Required environment variables

Set these for Supabase Edge Functions:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
CONTACT_WORKER_SECRET
AI_ENABLED=true
CONTACT_SEARCH_PROVIDER=none
```

Optional search settings:

```text
CONTACT_SEARCH_PROVIDER=openai_web_search
OPENAI_TEXT_MODEL=gpt-5.5
OPENAI_SMALL_MODEL=gpt-5.5-mini
SEARCH_API_ENDPOINT
SEARCH_API_KEY
SEARCH_MAX_RESULTS=5
```

Set these for Vercel:

```text
SUPABASE_URL
CONTACT_WORKER_SECRET
CRON_SECRET
```

The Vercel cron endpoint `/api/cron/contact-intelligence-worker` invokes the Supabase `contacts_worker` function every 10 minutes. The worker must be deployed with Supabase gateway JWT verification disabled because it uses `x-contact-worker-secret` instead of a user JWT. That header value must match `CONTACT_WORKER_SECRET`.
