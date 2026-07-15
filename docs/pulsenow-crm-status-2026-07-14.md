# PulseNow CRM: Status and Handoff

Date: July 14, 2026
Production app: https://pulsenow-push.vercel.app
Prepared by: Kelty Forman

## What PulseNow CRM is

PulseNow is our internal AI operating system for prospecting, in the same spirit as an
internal team OS like eCon Growth's. An agent uploads their raw contact list (CSV or
phone export), and Contact Intelligence researches each person against public web
signals, scores them against our four fit categories, and organizes the whole list
into a working CRM: who to call, why, and what to say, with compliance guardrails
built in.

The four fit categories: life insurance partner, financial educator, referral
partner, client prospect. Every contact also gets a priority tier (A, B, C, Nurture,
Manual Review, Do Not Contact), a next best action, and a suggested message angle.

## The end-to-end flow, verified live today

Each step below was exercised on the production app today, with results confirmed in
the database:

1. Register or log in (name, agent code, 4-digit PIN)
2. Import a CSV or phone contact export on the People tab
3. Contact Intelligence parses, dedupes, and categorizes the list in about a minute
4. Deep research runs public web searches per contact and attaches evidence
5. AI assessment scores each contact and assigns category, tier, and next action
6. Contacts land in the CRM, persisted to the backend and synced across sessions
7. The Today screen shows the ranked AI call list and unread notifications
8. Results can be exported to CSV

The app runs on real data only: demo mode was removed today. A failed login shows an
error instead of opening a local preview, stale demo sessions are cleared, and sample
contacts are never seeded.

Verification example from today: a test contact whose notes described an independent
broker was researched and correctly classified life insurance partner, tier B, with
evidence attached. Test data was removed after verification.

A demo login exists for anyone who wants to look around: agent code QATEST9, PIN 4242.

## Where the numbers stand (July 14, end of day)

- 6,753 contacts imported and parsed
- 6,752 assessed; the entire backlog cleared today and the pipeline now
  clears itself daily
- Priority tiers: 72 A, 322 B, 447 C, 64 manual review, 5,847 nurture
- Category highlights: 722 potential financial educators, 118 potential life
  insurance partners
- 905 contacts currently in the ranked next-actions call list (tiers A through
  manual review, do-not-contact excluded)

The A and B tiers are the immediate value: 394 researched, scored, reach-out-ready
prospects surfaced from lists that were previously sitting untouched.

## What was fixed and built today

The system was built but the engine had stalled, and the pipeline lacked the CRM
object model around it. Five changes, all live in production:

1. Assessment pipeline unstuck. The background worker was processing 5 contacts per
   day because the daily job only invoked it once. Two jobs had also been frozen
   since May 28. The stuck jobs were reset and the full backlog was cleared the
   same day (about 4,400 assessments completed during the fix session).
2. Daily self-draining cron. The daily job now keeps claiming work in parallel until
   the queue is empty, so future imports finish the same day instead of stalling.
3. Contact persistence repaired. A missing profile record caused every contact save
   to fail silently for accounts created before May 30. Registration now provisions
   the profile correctly, which was verified end to end with a fresh account today.
4. Pipeline CRM backend added (detail in the next section): deal stages with values,
   a clients table with automatic graduation, health scores with daily decay,
   per-user notifications, a team leaderboard, and a ranked AI call list.
5. The AI layer is now visible in the app. The Today screen gained four live cards:
   "Pipeline Snapshot" (open deals, pipeline value, hot prospects, clients),
   "Who to call next" (the ranked call list with tier, category, next best action,
   and suggested opening angle), "Notifications" (unread alerts with mark-read),
   and "Clients: Relationship health" (lowest health first).
6. Manual contact entry finished. The People screen has an Add Contact button with
   full fields (name, phone, email, company, city, state, deal value, notes, and
   qualifier tags), saving straight to the backend. Pipeline cards show a
   color-coded health score and the deal value, and cards can be dragged between
   stage columns as well as moved by dropdown.
7. Demo mode removed everywhere: no local-preview fallback on failed login, no
   sample contacts, no sample pipeline. The app requires a real account and shows
   only real data.
8. The full loop was verified on production through the real UI: a contact added
   manually with an $1,800 deal value, moved through the pipeline to Commission
   Paid/Complete, automatically graduated to Clients (health 80), and produced the
   "New client won" notification, all visible on the Today dashboard.

## The pipeline CRM backend

This layer was modeled on the eCon OS CRM (prospects and clients with health scores,
stage-driven pipeline, notifications, computed decay and leaderboard), adapted to
PulseNow's stack. Where eCon OS computes things in its web layer, PulseNow computes
them inside the database, which keeps the logic next to the data and inside the same
row-level security envelope.

Object model:

- Prospects: the `contacts` table. Each contact carries `stage` (the pipeline
  position), `deal_value_cents`, `health_score` (starts at 70), `last_activity_at`,
  qualifiers, notes, and follow-up dates.
- Clients: the `clients` table. When a contact reaches the pipeline's final stage
  (Commission Paid/Complete, or an explicit Won), a database trigger automatically
  creates the client record (health score starts at 80, with an MRR field for
  recurring value) and notifies the owner. No manual re-entry.
- Notifications: the `notifications` table, one row per user notification, with
  type, title, body, link, and read state. The graduation trigger and health-decay
  job write to it; the frontend can read and mark-read directly.
- Health decay: `pulse_decay_health_scores()` runs every morning at 8:30 UTC inside
  the database. Prospects that have had no activity for 7 days lose 2 points per
  day; clients quiet for 14 days lose 1 point per day; the owner gets a "needs
  attention" notification when a client crosses below 50. Health scores therefore
  reflect reality without anyone maintaining them.
- Leaderboard: `pulse_leaderboard`, a live view ranking each agent in the org by
  30-day activity points plus open pipeline value, with open-deal counts and client
  counts alongside.
- AI call list: `crm_next_actions`, a live view that turns the research pipeline's
  output into a daily operating list: every researched contact's priority tier,
  candidate category, next best action, suggested message angle, evidence summary,
  and confidence, ranked A tier first. It currently serves 905 rows.

All of it is queryable by the frontend the same way eCon OS does it: direct
PostgREST reads such as `/rest/v1/clients?select=id,name,health_score` or
`/rest/v1/crm_next_actions?order=sort_order&limit=20`, secured by row-level
security so each agent sees only their own book (plus org-level read where
appropriate).

## How the AI layer works

Two stages, both compliance-guarded:

- Deep research (`research_contacts` jobs): for each contact, the system builds
  targeted public-web search queries from name, company, role, and location, runs
  them through OpenAI web search, and stores the resulting evidence: source URLs,
  snippets, detected social/professional profiles, and any publicly visible
  business contact info (flagged for verification before outreach). Nothing is
  scraped from logged-in pages.
- Assessment (`assess_import_contacts` jobs): each contact is scored two ways.
  First a deterministic scorer seeds scores from concrete signals (has contact
  method, professional role, leadership or financial-services signals, independent
  versus captive indicators). Then the LLM refines that seed against the research
  evidence under a strict JSON schema, producing the four category scores, the
  priority tier, next best action, message angle, and evidence summary. If the
  model is unavailable, the deterministic score stands, so the pipeline never
  blocks on the AI.

Order of operations for a new import: upload parses and dedupes rows into
`contact_records`, categorization runs immediately (about a minute for a typical
list), research jobs fan out per contact, assessments follow automatically, and the
queue keeps claiming work until it is empty. The queue mechanics are simple and
inspectable: every unit of work is a row in `contact_jobs` with status and event
log, so a stalled job is visible rather than silent.

## Daily automation schedule (all times UTC)

- 8:00: Vercel cron runs the Contact Intelligence drain: claims queued research and
  assessment jobs in parallel until the queue is empty (240-second budget per run)
- 8:30: in-database health-score decay runs and writes any needed notifications
- 13:00: Vercel cron runs the daily power-list job

## Compliance guardrails

- Protected traits (gender, age, race, religion, health, and similar) are excluded
  from scoring by hard rules in the assessment prompt and the deterministic scorer,
  and any AI response that claims to have used one is forced into manual review
- Marital and homeowner status are display-only and never scored
- Do-not-contact flags suppress contacts entirely, including from the call list
- Captive-agent signals route to manual review instead of automated outreach
- Row-level security is enabled on every table; agents see their own book only

## Honest limitations and next milestones

- The leaderboard screen ranks by activity points and does not yet show the new
  pipeline-value ranking (the backend view for it is live and tested).
- A failed login currently returns to the landing page rather than showing the
  error message inline on the login card (cosmetic, next pass).
- Auth is PIN-based and adequate for internal use, not yet hardened for external
  customers (no password reset or account recovery yet)
- No duplicate-merge workflow across separate imports yet
- Contact detail editing and timeline are basic; notes and outcomes persist, but a
  full activity timeline is a next milestone
- Search is client-side; fine at current scale, needs a backend search once teams
  grow past a few thousand contacts per user
- Team hierarchy (WFG structure) tables exist and the data hub accepts report
  uploads; the visualization layer is a later phase

## Technical footprint

- Frontend: static app shell on Vercel (pulsenow-push project), direct Supabase
  reads for display data
- Backend: Supabase (Postgres, Auth, Storage, Edge Functions), project
  bcuzmwlrhmfgoumobwaj; computed CRM logic lives in Postgres functions and views;
  pg_cron handles in-database scheduling
- Job pipeline: `contact_imports`, `contact_records`, `contact_jobs` (with event
  log), `contact_enrichment_sources`, `contact_ai_assessments`
- CRM layer: `contacts`, `clients`, `notifications`, `pulse_leaderboard`,
  `crm_next_actions`, `pulse_decay_health_scores()`
- AI: OpenAI for research (web search) and assessment (structured JSON scoring)
- Code: github.com/keltysage01/pulsenow (today's fixes on branch crm-pipeline-fix,
  deployed to production; database changes mirrored in
  supabase/migrations/202607140001_crm_pipeline_econ_parity.sql)
