# Pulsenow Backend Architecture

This is the backend build that slots into your existing Codex UI. Everything here is designed to integrate at the exact insertion points Codex already left open:

* **AI Power List Preview** ("Claude ranking plugs in here later") → wired to `/api/power-list/today`
* **Kanban Board** ("Supabase journey history plugs in later") → wired to `pipeline_cards` + `pipeline_history` tables
* **AI Coach** ("Claude plugs into the same chat surface through the server-side proxy") → wired to `/api/coach/chat`

## The core idea

Pulsenow is built on one principle: **AI does the prospecting and research, the human does the connection.** The app gamifies the human side (streaks, leaderboard, tiers) and automates the tax that keeps people from doing the human side well (list cleaning, social research, captive vs independent classification, conversation hooks).

## What this backend gives you

1. **Daily Power List engine** that scans all your contacts, surfaces the top 3 to call today, and gives each one a specific conversation hook based on social signals.
2. **AI Coach** that knows each user's Four Tendencies type, Working Genius profile, goals, and current week stats so it coaches in their language.
3. **CSV upload + classifier** for licensed insurance producers that auto tags captive vs independent and male vs female.
4. **Social enrichment pipeline** that pulls public signals from LinkedIn, Facebook, Instagram, and open web, then summarizes them into usable hooks.
5. **Personality assessments** (Four Tendencies and Working Genius) that feed every other AI interaction.
6. **Activity logging + points + streaks** that tie to the existing UI tiers (No Timer, Part Timer, All the Timer).
7. **Leaderboard** scoped per team, neighborhood, and org, with day/week/month/all time views.
8. **Org and team scaffolding** for white label later, with row level security so one org never sees another org's data.

## Tech stack assumptions

* Next.js App Router with React
* Supabase for auth, Postgres, Storage, and Realtime
* Anthropic API for Claude (server side only, via your existing proxy)
* Vercel for hosting
* Third party enrichment vendor for social data (recommendation: PeopleDataLabs or Apollo for B2B, Proxycurl for LinkedIn specifically). The enrichment layer is pluggable so you can swap vendors.

## Folder structure

```
pulsenow-backend/
├── README.md                          ← you are here
├── .env.example                       ← required environment variables
├── supabase/migrations/
│   └── 20260521000001_init_pulsenow.sql   ← run this in Supabase SQL editor
├── app/api/
│   ├── coach/chat/route.ts            ← AI Coach streaming endpoint
│   ├── power-list/today/route.ts      ← daily ranked prospects
│   ├── contacts/upload/route.ts       ← CSV upload + parse + classify
│   ├── contacts/[id]/enrich/route.ts  ← social research for one contact
│   ├── activity/log/route.ts          ← log daily points
│   ├── leaderboard/route.ts           ← scoped leaderboard
│   └── assessments/submit/route.ts    ← Four Tendencies + Working Genius
├── lib/
│   ├── claude.ts                      ← Anthropic client wrapper
│   ├── supabase.ts                    ← Supabase server client
│   ├── prompts/
│   │   ├── coach.ts                   ← Coach system prompt builder
│   │   ├── power-list.ts              ← Daily ranking prompt
│   │   ├── prospect-research.ts       ← Social research summarizer
│   │   └── captive-classifier.ts      ← Captive vs independent classifier
│   ├── personality/
│   │   ├── four-tendencies.ts         ← 13 question quiz + scorer
│   │   └── working-genius.ts          ← 30 question quiz + scorer (WIDGET)
│   └── enrichment/
│       └── social.ts                  ← Pluggable enrichment adapter
└── scripts/
    └── seed-demo-data.ts              ← Optional, creates a demo org
```

## Setup steps (give these to Codex)

### 1. Run the migration

Open Supabase SQL editor for the Pulsenow project and paste in `supabase/migrations/20260521000001_init_pulsenow.sql`. It is idempotent and creates every table, index, RLS policy, and trigger.

### 2. Add environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ENRICHMENT_API_KEY=
ENRICHMENT_VENDOR=peopledatalabs
```

### 3. Install packages

```bash
npm install @anthropic-ai/sdk @supabase/supabase-js @supabase/ssr csv-parse zod
```

### 4. Drop the files in

Copy each file in `app/api/` and `lib/` into the matching path in your repo. They are written as drop ins, not replacements, so they will not collide with anything Codex built unless you already named something the same.

### 5. Wire up the UI hooks

The three Codex placeholder spots get one line each:

* AI Power List Preview → `fetch('/api/power-list/today')`
* AI Coach chat → POST to `/api/coach/chat` with `{ session_type, messages }`
* Kanban save → POST stage change to `/api/pipeline/move` (stub included in routes)

## Data model overview

```
organizations
  └── teams
        └── profiles (agents and leaders)
                ├── vision_board_items
                ├── weekly_goals
                ├── contacts ────── producer_details (extension for licensed producers)
                │      ├── contact_events
                │      ├── pipeline_cards
                │      └── prospect_recommendations (daily Power List)
                ├── activity_log + points_ledger + streaks
                ├── coach_sessions + coach_messages
                └── assessments (four_tendencies, working_genius)
```

## Daily Power List flow

This is the centerpiece feature. Here is the exact sequence that runs once per day per user (triggered by cron or on first app open):

1. Pull all contacts for this profile not contacted in the last 14 days
2. Pull any enrichment data already attached
3. Score each contact on three axes:
   * **Fit score** (the 7 qualifier boolean count, already in your UI)
   * **Recency score** (how long since last touch, with a sweet spot)
   * **Signal score** (does enrichment data have a specific recent hook)
4. Send the top 25 to Claude with the Power List prompt
5. Claude returns the top 3 with a specific one sentence hook per contact
6. Store as `prospect_recommendations` rows for today
7. Surface in the UI

When the user logs the contact in the UI, the recommendation row gets `acted_on_at` set, which feeds back into next day's algorithm so it learns which signals actually convert for that user.

## AI Coach flow

The coach is not a generic chatbot. It is loaded with:

* User's Four Tendencies type (changes how it gives directives)
* User's Working Genius (changes what kind of help it offers vs reassigns)
* User's weekly goals and current progress
* User's mission statement from the Vision Board
* Last 7 days of activity
* Current tier and points to next tier
* The active session type (Tactical, All the Timer, Who to Call, Pipeline)

That context is rebuilt server side on every message so it never drifts. The prompt builder is in `lib/prompts/coach.ts`.

## Social enrichment honesty check

Direct scraping LinkedIn, Facebook, and Instagram will get you blocked, sued, or both. The supported approach is:

* **LinkedIn**: Proxycurl API (paid, $0.10 per person, fully legal)
* **Facebook and Instagram**: Public profile lookup via PeopleDataLabs or Apollo
* **Open web**: Anthropic's web_search tool in the Claude API (already wired into the prompt)
* **Manual fallback**: Users paste a LinkedIn URL into the contact and Claude fetches it via web_fetch

The `lib/enrichment/social.ts` file is written as an adapter so you can plug any vendor in without touching the rest of the code.

## What I did NOT build (yet)

* The Stripe billing layer for the white label tier (you have Stripe already, can add later)
* The Manager View aggregations (the schema supports it, but the routes are not in this drop)
* Push notifications for "your top 3 are ready" (can add via Vercel cron + email or push)
* The CSV import UI itself (Codex builds UI, this is just the backend route that accepts the upload)

## Order to ship in

1. Run migration
2. Wire `/api/coach/chat` (smallest, fastest win, immediately useful)
3. Wire `/api/contacts/upload` so you can dump your 298 Idaho producers in
4. Wire `/api/contacts/[id]/enrich` and run it on the uploaded list
5. Wire `/api/power-list/today` (depends on enrichment)
6. Wire activity logging + leaderboard
7. Wire assessments
8. Add cron job for daily Power List generation

That is the full picture. Read `supabase/migrations/20260521000001_init_pulsenow.sql` next, that is where the real architecture lives.
