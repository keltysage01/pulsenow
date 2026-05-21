# FOR_CODEX.md

Read this file first. It's written specifically for a coding agent to execute step by step.

## What this is

A complete backend bolt-on for the Pulsenow Next.js app. Drop the files into the repo, follow the steps below, and the deployed UI at `pulsenow-push.vercel.app` becomes a real working app.

## Stack

* Next.js 14+ App Router
* Supabase (Auth + Postgres + Storage)
* Anthropic Claude (server-side only)
* Vercel hosting

## Step 1: Install dependencies

```bash
npm install @anthropic-ai/sdk @supabase/ssr @supabase/supabase-js csv-parse bcryptjs zod
npm install -D @types/bcryptjs tsx
```

If the user wants to skip bcrypt (PIN hashing in onboarding), remove the bcrypt import from `app/api/onboarding/route.ts` and set `pinHash = null`.

## Step 2: Verify TypeScript path alias

The route files use `@/lib/...` imports. Open `tsconfig.json` and confirm this exists in `compilerOptions`:

```json
{
  "paths": {
    "@/*": ["./*"]
  }
}
```

If not, add it. This is the standard Next.js convention; the official `create-next-app` template includes it by default.

## Step 3: Set environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ENRICHMENT_VENDOR=mock
ENRICHMENT_API_KEY=
CRON_SECRET=
```

Generate `CRON_SECRET` with `openssl rand -hex 32`.

Add the same vars to Vercel project settings under Environment Variables. Mark `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` and `CRON_SECRET` as "secret" so they're only available server-side.

## Step 4: Run the SQL migrations

Open the Pulsenow Supabase project in the dashboard. Go to SQL Editor.

Run these in order:

1. `supabase/migrations/20260521000001_init_pulsenow.sql` (the schema)
2. `supabase/migrations/20260521000002_helpers_and_views.sql` (RPCs and views)

Both are idempotent. You can re-run if needed.

## Step 5: Copy the files into the repo

The folder layout is intentionally arranged to drop in as-is:

```
your-pulsenow-repo/
├── middleware.ts                              ← if you don't have one, copy as is. If you do, merge.
├── vercel.json                                ← merge with existing if present
├── app/api/                                   ← copy all subfolders into your app/api/
├── lib/                                       ← copy entire folder
├── types/database.ts                          ← copy then run `supabase gen types` to overwrite with real types
├── scripts/seed-demo-data.ts                  ← optional
└── examples/                                  ← reference only, not required
```

Do NOT copy the markdown files (README.md, INTEGRATION_GUIDE.md, FOR_CODEX.md, CHANGELOG.md) into the repo unless you want them. They are for human reference.

## Step 6: Generate Supabase types (recommended but optional)

After the migrations are applied:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase gen types typescript --linked > types/database.ts
```

Then update `lib/supabase.ts` to use the generated `Database` type. Without this, queries return `any`.

## Step 7: Wire up the existing UI

The UI at `pulsenow-push.vercel.app` was built with explicit placeholder hooks. See `INTEGRATION_GUIDE.md` for the full UI to endpoint mapping. The four highest-priority wires:

1. **Daily Pulse buttons** (the "+10 contacts", "+1 appointment", etc.): replace the sessionStorage stub with `POST /api/activity/log` from `examples/hooks.ts` (`useActivityLog`). The response includes the updated tier and streak so the UI can update without a refetch.

2. **AI Power List Preview card**: replace the "Generated locally" data with `GET /api/power-list/today` (`usePowerList` hook). The Refresh button calls the same endpoint with `?refresh=1`.

3. **AI Coach chat textarea**: wire to `POST /api/coach/chat` using `useCoachChat(sessionType)` where sessionType matches the active tab.

4. **CSV upload on Contacts tab**: hit `POST /api/contacts/upload` with a multipart form. The CSV columns are flexible; see the route doc comment.

## Step 8: Deploy

```bash
vercel --prod
```

The cron job in `vercel.json` will automatically register and start running daily at 13:00 UTC. Verify in the Vercel dashboard under "Cron Jobs".

## Step 9: First test pass

1. Visit the deployed app, sign up via Register.
2. The frontend should call `POST /api/onboarding` immediately after Supabase Auth signup completes. If Codex didn't already wire this, add it now.
3. Check Supabase: the new user should appear in `auth.users`, and a `profiles` row, default vision board items, and default weekly goals should exist for them.
4. From the dashboard, try the Daily Pulse "+10 contacts" button. It should bump points to 10 and tier to Part Timer.
5. Go to Contacts, click Add Contact, fill in a test contact. It should save.
6. Open AI Coach, send "what should I focus on today?". You should get a response that references the user's actual data.

If any step fails, check:
* Browser console for fetch errors (probably auth or missing env var)
* Supabase logs for SQL errors (probably RLS or migration not run)
* Vercel function logs for runtime errors (probably missing env var or bad type)

## Common gotchas

* **"no profile" error from API routes**: the user signed up via Supabase Auth but `/api/onboarding` was never called. Wire the post-signup hook.
* **Coach returns empty reply**: `ANTHROPIC_API_KEY` is missing or invalid. Check Vercel env.
* **Power List always empty**: there are no contacts yet, or they're all contacted within the last 14 days, or they're all in stage = dead. Add a few contacts with recent uploads or run the seeder.
* **CSV upload fails**: file has unusual headers. The parser is case-insensitive but accepts variations; check the route doc for accepted column names.
* **Cron job not firing**: `CRON_SECRET` mismatch between Vercel env and `.env.local`. They must be identical.
* **RLS denying queries**: the user's `profiles.org_id` is null. The onboarding flow should set it; if it's null, run `update profiles set org_id = (select id from organizations limit 1) where id = '<user-id>'`.

## What this build does NOT include

* Streaming for the coach chat (currently returns the full reply at once)
* Push notifications for daily Power List ready
* Stripe billing (you have Stripe MCP available, can wire that separately)
* Email notifications (Resend or similar)
* File upload to Supabase Storage (avatars, vision board images)
* A `/api/me/badges` or `/api/me/career` endpoint (badges and career track on the Me screen still need their own logic)

If the user asks for any of those, ask Claude to add them.

## Done.

If you completed steps 1-9 without errors, the app is functional. Hand back to the user with a short summary of what's live and what isn't.
