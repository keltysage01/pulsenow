# PulseNow Working App Handoff

Date: 2026-06-09

Production: https://pulsenow-push.vercel.app

Repo: https://github.com/keltysage01/pulsenow.git

Current pushed commit at handoff: `5f3ce0a Move People attention card to Today`

Working checkout for recent work: `/tmp/pulsenow-fresh`

## Read This First

PulseNow is not a fully working multi-user app yet.

The shipped production surface is still the root static shell in `index.html`, built by:

```bash
npm run build
```

That command runs:

```bash
node scripts/vercel-static-build.mjs
```

The React/Vite source tree and older backend docs exist, but production is currently the static `index.html` shell plus Vercel API routes and Supabase migrations/functions. Do not assume this is a normal Next.js App Router app. Do not rebuild the UI from scratch. Continue hardening the existing static shell unless the team explicitly decides to migrate the frontend.

## What Changed In The Latest UI Pass

Recent shipped changes:

- Removed the in-app social feed and story rail.
- Removed the Team chat UI and changed the center nav back to `Coach`.
- Kept Contact Intelligence social/LinkedIn research because that is CRM enrichment, not a social feed.
- Moved the `Who needs attention` People card onto Today directly under the `Good afternoon` card.
- Removed that People attention card from the top of the People tab.
- The `Add` button on the moved card now switches to People and opens the add-contact form.
- Tightened the Today greeting card because it was visually too large.
- Removed visible white text backplates behind header text.
- Made the Dream Life mic icon stand alone without its previous border.
- Removed the weird slash/line from the Me daily action card.
- Enlarged the three landing-page benefit icons.
- Added `docs/social-media-feature-removal-handoff.md`.

Verification from the latest pass:

- `npm run build` passed.
- `git diff --check` passed.
- Local preview verified the moved People card under Today.
- Production source and production render verified the moved People card after push.

## Current Product Shape

### Public Landing Page

Mostly visual/static. It has real assets and messaging, but not a complete acquisition funnel.

Current state:

- Root page can show landing mode when no app session is present.
- Desktop and mobile landing design exists.
- Main CTAs are present.

Not finished:

- No real demo-booking integration is confirmed.
- No lead capture pipeline is confirmed.
- No analytics event tracking is wired.
- No A/B tracking or conversion reporting.
- No authenticated redirect strategy after signup/login.
- No real pricing/account plan flow.

Needed to make it real:

- Wire `Book a Demo` to the actual scheduler or CRM form.
- Track CTA clicks, landing-page section views, login starts, signup starts, and demo submissions.
- Decide whether `Log in` opens the app login, Supabase Auth, or an external auth flow.
- Add production analytics: Vercel Web Analytics, PostHog, or another event pipeline.
- Add clear app deep-link behavior for logged-in users.

### Auth And Accounts

This is one of the biggest unfinished areas.

Current state:

- The static shell has a custom name/PIN style login.
- `sessionStorage` key: `pulsenow_session`.
- Demo/local fallback uses `id: "demo-user"`.
- Some backend session/profile logic exists in `index.html`.
- API helpers can read an `x-pulsenow-session` header.
- Supabase client helpers exist in `api/_lib/pulse-utils.js`.

Not finished:

- No reliable production-grade auth model is completed end to end.
- The app is not consistently using Supabase Auth as the source of truth.
- PIN auth is not production secure unless it is backed by proper server-side hashing, rate limiting, account recovery, and audit logging.
- Session data still depends heavily on `sessionStorage`.
- User/org identity is not consistently enforced across every feature.
- There is no complete invite/onboarding flow for teams.
- No password reset, magic link, SSO, or account recovery flow.
- No roles/permissions UI for admin, leader, manager, or agent.

Needed to make it real:

- Decide auth model:
  - Option A: Supabase Auth with email/password or magic link.
  - Option B: keep PIN login but implement real backend profile lookup, hashed PINs, lockouts, audit logs, and recovery.
- Build a real `/api/onboarding` or equivalent flow that creates:
  - auth user
  - profile
  - org membership
  - default goals
  - default badges/career state
  - optional WFG team linkage
- Replace client-only `sessionStorage` identity with server-validated identity.
- Add auth middleware or equivalent request validation for every API route.
- Add org-scoped RLS checks and test them with two users in different orgs.
- Add logout that clears local state and backend session cleanly.

### Today Screen

Current state:

- Today has the `Good afternoon` greeting card.
- It has Dream Life reminder/progress UI.
- It now shows `Who needs attention` directly under the greeting.
- The moved People card includes contact search, filters, shortcuts, and Add.
- It uses local/session state and the contacts array already loaded by the shell.

Not finished:

- The greeting card is mostly motivational UI, not a real daily operating system yet.
- `Who needs attention` filters the local contacts collection, but it is not yet a backend-powered daily priority engine.
- The Dream push meter is not fully tied to real persistent Dream Life progress.
- The Today card does not yet show a real server-generated ranked action plan.
- No push notification or daily reminder system.
- No daily reset/rollover logic controlled by backend time zone.
- No audit trail for why a person appears in attention.

Needed to make it real:

- Define a backend `today_dashboard` or `daily_action_plan` endpoint.
- Persist daily plan rows with:
  - `profile_id`
  - `org_id`
  - date
  - priority contact ids
  - reason
  - next best action
  - completion status
  - created_by model/version
- Replace local priority logic with backend plan generation.
- Add completion actions from Today:
  - contacted
  - booked appointment
  - no answer
  - not a fit
  - snooze
  - add note
- Write every action to activity logs and contact timeline.
- Add time-zone aware daily rollover.
- Add empty states for new users with zero contacts.

### People / CRM

Current state:

- People tab still contains:
  - CSV import panel
  - add contact panel
  - contact detail panel
  - contact list / CRM organization
  - Contact Intelligence UI hooks
- The `Who needs attention` search/filter card moved to Today.
- Contacts can be stored in session storage for demo/local mode.
- `persistBackendContact`, `loadBackendContacts`, and related backend methods exist in the static shell.
- `api/contacts/upload.js` exists.
- Supabase Contact Intelligence schema and functions exist in the repo.

Not finished:

- Manual contact CRUD is not fully backend-first.
- Contact updates, notes, outcomes, follow-ups, and stage moves are not consistently persisted across sessions/devices.
- Contact detail editing is not complete as a production CRM.
- No duplicate detection/merge workflow.
- No robust phone/email normalization everywhere.
- No full contact timeline.
- No import review queue with accept/reject/merge controls.
- No consent/compliance workflow for outreach.
- No bulk edit, tags, owners, assignment, or source tracking UI at production quality.
- No true search backend; current search is client-side over loaded contacts.
- No pagination/infinite loading for large teams.

Needed to make it real:

- Make Supabase `contacts` the source of truth for all contact records.
- Add API or Supabase RPCs for:
  - create contact
  - update contact
  - delete/archive contact
  - merge duplicates
  - add note
  - log touchpoint
  - set next follow-up
  - change stage
  - assign owner
  - bulk import review decisions
- Create `contact_events` or use existing activity/timeline tables for every user action.
- Add indexes for search by name, email, phone, category, next follow-up, owner, and org.
- Add a server-side search endpoint with pagination.
- Add a duplicate-detection pass on import and manual add.
- Add vCard/mobile contacts import as a first-class flow if phone-contact import remains a product promise.

### Contact Intelligence

Current state:

- Contact Intelligence is partially built.
- Migration exists: `supabase/migrations/202605230002_contact_intelligence.sql`.
- Edge functions exist under `supabase/functions/contacts_*`.
- Deployment notes exist in `docs/contact-intelligence/DEPLOYMENT_NOTES.md`.
- Vercel route `api/contacts/research-socials.js` exists.
- Vercel cron `api/cron/social-research-daily.js` exists.
- Contact social profile storage is intentionally kept, even though social feed was removed.

Not finished:

- It is not confirmed that every Supabase Edge Function is deployed in production.
- It is not confirmed that production env vars are complete.
- Search provider may still be `none`.
- The UI still needs stronger job-state handling for queued/running/done/error.
- The user needs review controls before AI classifications become trusted CRM data.
- There is no clear cost guardrail for research jobs.
- Public social/LinkedIn data should be treated as unverified until reviewed.
- No compliance review for scraping/search provider terms.

Needed to make it real:

- Apply Contact Intelligence migration to the real Supabase project.
- Deploy:
  - `contacts_create_import`
  - `contacts_create_upload_url`
  - `contacts_submit_csv`
  - `contacts_worker --no-verify-jwt`
  - `contacts_get_import`
  - `contacts_research_batch`
  - `contacts_export_csv`
  - `contacts_update_contact`
- Set Supabase Edge Function secrets:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `CONTACT_WORKER_SECRET`
  - `AI_ENABLED=true`
  - `CONTACT_SEARCH_PROVIDER`
  - search provider keys if enabled
- Set Vercel env:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY`
  - `CONTACT_WORKER_SECRET`
  - `CRON_SECRET`
- Add a UI review queue:
  - accepted category
  - rejected category
  - edit category
  - verify source
  - mark do-not-contact
- Add job metrics:
  - contacts imported
  - contacts assessed
  - contacts failed
  - total tokens/cost
  - search calls
  - average confidence
- Add safe language: "suggested" and "verify before outreach."

### Activity Logging / Points / Tiers

Current state:

- The app has activity UI and point/tier logic.
- `api/activity/log.js` exists.
- `calculatePoints` exists in `api/_lib/pulse-utils.js`.
- Frontend still uses `sessionStorage` heavily for logs and feed.
- Backend activity snapshot methods exist in `index.html`.

Not finished:

- Daily activity is not fully backend authoritative.
- Points can still be local/demo-only.
- There is no full immutable activity ledger.
- No server-side anti-cheat or validation.
- No correction flow for mistakes.
- No manager approval/visibility logic.
- No clean historical reports by day/week/month.

Needed to make it real:

- Create or finalize an immutable `activity_events` table.
- Every button/action should write one event with:
  - user
  - org
  - type
  - amount
  - points
  - related contact id
  - source screen
  - created_at
  - idempotency key
- Calculate daily/weekly/monthly totals server-side.
- Keep a snapshot table only as a cache, not the source of truth.
- Add edit/reversal events instead of destructive updates.
- Add backend validation for point rules.
- Make Today, Progress, Me, and Leaderboard all read the same backend totals.

### Progress / Leaderboard

Current state:

- Progress screen and leaderboard UI exist.
- Some backend leaderboard migration/work exists.
- `refreshBackendLeaderboard` exists in the static shell.
- WFG team hierarchy migrations exist.

Not finished:

- Leaderboard is not fully reliable as a multi-user source of truth.
- Team membership and org hierarchy are not complete.
- WFG import/hierarchy is partial and needs production data validation.
- The Progress screen mixes demo/local and backend concepts.
- No manager/team-room selection model.
- No permissions model for who can see whose stats.

Needed to make it real:

- Finalize tables for:
  - organizations
  - profiles
  - memberships
  - teams
  - manager/team hierarchy
  - activity totals
  - leaderboard snapshots
- Decide visibility rules:
  - individual
  - direct team
  - whole org
  - manager rollups
  - all-time leaderboard
- Generate leaderboard snapshots server-side.
- Add filters for week/month/all-time backed by SQL.
- Add tests that two orgs cannot see each other's leaderboard.
- Add WFG import mapping documentation and validation screens.

### AI Coach

Current state:

- Coach tab is back as the center nav.
- `api/coach/chat.js` exists.
- `api/coach/weekly-quiz-insight.js` exists.
- Coach messages are cached in `sessionStorage`.
- Quiz/profile support exists.
- The UI has Ask Coach entry points.

Not finished:

- Coach is not fully grounded in reliable backend user data.
- Conversation history is not persistently stored.
- No streaming.
- No tool calling/actions from coach.
- No strict guardrails for financial/insurance advice.
- No coach memory model.
- No admin-configurable coaching playbooks.
- No evaluation harness.

Needed to make it real:

- Persist coach threads/messages to Supabase.
- Send backend-derived context only:
  - profile
  - quiz type
  - daily activity
  - contacts due
  - recent outcomes
  - goals
  - Dream Life summary
- Add system safety:
  - no regulated financial advice
  - relationship-first outreach
  - verify licensed/business claims
  - no fabricated contact research
- Add actions:
  - create follow-up
  - draft text
  - log outcome
  - add note
  - update contact category
- Add eval cases for bad advice, hallucinated data, and unsupported claims.
- Add streaming response UI if the chat experience matters.

### Dream Life Builder

Current state:

- Dream Life UI exists in the static shell.
- Voice/transcript-first flow exists.
- Vercel endpoint `api/dream-life/generate.js` exists.
- It uses OpenAI when `OPENAI_API_KEY` is configured.
- It intentionally returns `generation_not_configured` instead of fake output if OpenAI is missing.
- Supabase Dream Life migration exists: `202605230001_dream_life_builder.sql`.
- Dream Life Edge Function docs and function pack exist.

Not finished:

- Dream Life is not fully integrated as a production backend feature.
- Generated images are not fully handled through private Supabase Storage in the static shell path.
- The final printable/exportable Dream Life Map is not complete.
- Worker pipeline is not confirmed deployed.
- No quota/cost limit.
- No deletion/export/privacy controls.
- No reliable background job progress UI across reloads.
- The local static shell still uses localStorage for parts of dream state.

Needed to make it real:

- Apply Dream Life migration.
- Create private `dream_life_assets` bucket.
- Deploy:
  - `dream_create_session`
  - `dream_create_upload_url`
  - `dream_submit_input`
  - `dream_start_build`
  - `dream_get_session`
  - `dream_regenerate_image`
  - `dream_worker`
- Set secrets:
  - `OPENAI_API_KEY`
  - `OPENAI_TEXT_MODEL`
  - `OPENAI_TRANSCRIBE_MODEL`
  - `OPENAI_IMAGE_MODEL`
  - `DREAM_ASSETS_BUCKET`
  - `DREAM_WORKER_SECRET`
  - optional `WISPR_ENABLED`
- Store audio, transcripts, generated categories, generated image prompts, image assets, final map assets, and events.
- Add polling or realtime job status.
- Add retry/regenerate controls.
- Add delete/export controls.
- Add cost caps per user/month.

### Me Screen / Profile / Badges

Current state:

- Me screen exists.
- Daily action card was moved to the top of Me in prior work.
- Profile card and badge UI exist.
- Badge persistence code exists in parts of `index.html`.
- Backend badge award migration work exists.

Not finished:

- Profile editing is not fully backend authoritative.
- Avatar upload/storage is not complete.
- Badges/career track do not have a clean backend API surface.
- Badge awarding can still depend on local state.
- No manager/admin view of user profile.
- No notification when badges are earned across devices.

Needed to make it real:

- Add profile update endpoint/RPC.
- Add private/public avatar storage bucket rules.
- Add `/api/me/badges` and `/api/me/career` or equivalent Supabase functions.
- Make badge awards server-calculated from immutable activity events.
- Add badge award history.
- Add profile privacy controls.
- Add tests for badge idempotency.

### Pipeline / Power List

Current state:

- Pipeline and Power List UI exist.
- `api/power-list/today.js` exists.
- `api/cron/power-list-daily.js` exists.
- Power List shortcuts exist from Today.

Not finished:

- Power List is not fully persistent or explainable.
- Pipeline card moves are not fully connected to contact outcomes.
- Pipeline history is not consistently used as the source of truth.
- No SLA/follow-up automation.
- No reminder queue.

Needed to make it real:

- Persist daily power list picks.
- Store why each person was picked.
- Connect "call/text/log outcome" to contacts and activity events.
- Write pipeline moves to `pipeline_history`.
- Add follow-up reminders and due-date views.
- Add "why this person" source evidence from contact data.
- Add refresh rules and avoid repeatedly surfacing completed contacts.

### Notifications / Cron / Background Jobs

Current state:

- `vercel.json` has two daily cron routes:
  - `/api/cron/power-list-daily`
  - `/api/cron/social-research-daily`
- Supabase worker docs exist.

Not finished:

- Cron auth/secret handling needs confirmation.
- No user-facing notification channel.
- No job dashboard.
- No retry/dead-letter UI.
- No monitoring alerts.

Needed to make it real:

- Add `CRON_SECRET` validation to cron endpoints if not already strict enough.
- Add durable job tables for each background workflow.
- Add job status UI for admins.
- Add email/SMS/push provider if reminders are a product requirement.
- Add Vercel/Supabase log monitoring.
- Add failure alerts.

### Social / Team Chat

Current state:

- Removed from shipped UI.
- Drop migrations exist:
  - `supabase/migrations/202606090001_drop_social_feed.sql`
  - `supabase/migrations/202606090002_drop_team_chat.sql`
- Handoff exists: `docs/social-media-feature-removal-handoff.md`.

Not finished:

- Production Supabase may still have old social/team chat objects unless migrations were applied.
- No social feed should be rebuilt unless product direction changes.
- No Team chat should be rebuilt unless product direction changes.

Needed:

- Apply the drop migrations to production Supabase if not already applied.
- Confirm `public.social_posts` and `pulse_chat_*` objects are gone.
- Keep Contact Intelligence `contact_social_profiles`.

## Highest Priority Build Order

Do this order if the goal is "make PulseNow a working app," not just polish screens.

1. **Auth and org identity**
   - Real users, real profiles, real org membership, real session validation.

2. **Contacts as source of truth**
   - All add/import/edit/search/filter/detail actions persist to Supabase.

3. **Activity event ledger**
   - Every point, call, appointment, and outcome writes to backend.

4. **Today action plan**
   - Backend-ranked contacts and daily action state.

5. **Coach grounded in real data**
   - Coach reads backend state and can create/log actions.

6. **Contact Intelligence productionization**
   - Deploy functions, add review queue, add cost/safety controls.

7. **Dream Life productionization**
   - Deploy worker/storage, persist sessions/assets, add export/delete/quota.

8. **Leaderboard/team hierarchy**
   - Generate server-side rollups and enforce visibility permissions.

9. **Notifications and background jobs**
   - Cron, reminders, job status, monitoring.

10. **Billing/admin/reporting**
   - Only after core app behavior is trustworthy.

## Specific Files To Start From

Static shell:

- `index.html`
- `scripts/vercel-static-build.mjs`

Vercel API routes:

- `api/_lib/pulse-utils.js`
- `api/activity/log.js`
- `api/power-list/today.js`
- `api/coach/chat.js`
- `api/dream-life/generate.js`
- `api/contacts/upload.js`
- `api/contacts/research-socials.js`
- `api/cron/power-list-daily.js`
- `api/cron/social-research-daily.js`

Supabase migrations:

- `supabase/migrations/20260521000001_init_pulsenow.sql`
- `supabase/migrations/20260521000002_helpers_and_views.sql`
- `supabase/migrations/202605230001_dream_life_builder.sql`
- `supabase/migrations/202605230002_contact_intelligence.sql`
- `supabase/migrations/202605250001_quiz_assessments.sql`
- `supabase/migrations/202605280001_contact_worker_import_claim.sql`
- `supabase/migrations/202605300001_backend_foundations.sql`
- `supabase/migrations/202605300002_wfg_team_hierarchy.sql`
- `supabase/migrations/202606090001_drop_social_feed.sql`
- `supabase/migrations/202606090002_drop_team_chat.sql`

Supabase functions:

- `supabase/functions/contacts_*`
- `supabase/functions/dream_*`
- `supabase/functions/_shared/*`

Docs that matter:

- `docs/social-media-feature-removal-handoff.md`
- `docs/contact-intelligence/DEPLOYMENT_NOTES.md`
- `docs/dream-life-builder/DEPLOYMENT_CHECKLIST.md`
- `docs/backend/FOR_CODEX.md`

Warning: `docs/backend/FOR_CODEX.md` references a Next.js/App Router backend shape. Use it for business logic and endpoint intent, not as proof that production is currently a Next.js app.

## Production Readiness Checklist

Before calling PulseNow a working app, verify these with two real users in two different orgs:

- User A cannot read User B contacts across orgs.
- User A activity does not affect User B leaderboard.
- Contact add/edit/delete persists after reload and on another browser.
- CSV import persists, creates reviewable contacts, and handles errors.
- Contact Intelligence job states survive reload.
- Coach references only real available data.
- Dream Life transcript and generated result persist after reload.
- Badges are awarded once and survive logout/login.
- Leaderboard updates from backend events, not local storage.
- Daily Today action plan is generated server-side and can be completed.
- Cron routes run in Vercel and record job results.
- All secrets are server-side only.
- No service role key appears in browser code.
- No social feed/team chat UI remains.
- Drop migrations have been applied if old social/chat tables exist.

## Commands For The Next Builder

Use this checkout:

```bash
cd /tmp/pulsenow-fresh
git status --short
npm run build
git diff --check
```

Search for local/demo state:

```bash
rg -n "demo-user|sessionStorage|localStorage|fallback|generated locally|not configured" index.html api docs
```

Search for removed social/team chat residue:

```bash
rg -n "social_posts|social-story|social-assets|Wins & Stories|team chat|pulse_chat|hydrateSocialPosts|createSocialPost" index.html scripts supabase docs public
```

Expected social search result:

- Contact Intelligence social research references are allowed.
- `docs/social-media-feature-removal-handoff.md` is allowed.
- Drop migration references are allowed.
- Shipped UI references to social feed/story rail/team chat should not return.

## Blunt Summary

The UI is ahead of the backend.

The app looks close because the static shell has a lot of polished screens, but the core product is not truly production-complete until auth, contacts, activity, Today, Coach, Contact Intelligence, Dream Life, and leaderboard all read/write the same backend state with org-scoped permissions.

Do not add another shiny feature before closing the data loop:

1. Real user.
2. Real org.
3. Real contacts.
4. Real actions.
5. Real points.
6. Real ranked daily plan.
7. Real coach context.
8. Real persistence after reload and across devices.

