# UI to API Integration Guide

This maps every interactive element in the deployed Pulsenow UI (https://pulsenow-push.vercel.app) to the backend endpoint that powers it. Hand this to Codex along with the README and it knows exactly where to wire each call.

## Auth / Onboarding

| UI element | Endpoint | Notes |
|---|---|---|
| Register form (Name, Agent Code, Leader Code, 4-digit PIN) | `POST /api/onboarding` | After Supabase Auth `signUp`, call this with the form values. |
| Login form | Supabase Auth `signIn` | Standard Supabase client call, no custom endpoint needed. |

## Agent Dashboard (`/`)

| UI element | Endpoint | Notes |
|---|---|---|
| Header stats (Streak / Contacts / Team) | `GET /api/contacts?limit=1` + read `total` count, `GET /api/leaderboard?scope=team` for team count, derive streak from `/api/coach/chat` context call (or expose dedicated `/api/me` if cleaner) | We can add a `/api/me` endpoint if you want one trip instead of three. |
| Vision Board with editable goals | `GET /api/vision-board`, `PATCH /api/vision-board/[id]` | The percentage is computed server-side from current/target. |
| This Week's Goals | `GET /api/weekly-goals` (returns goals with live `actual`), `POST /api/weekly-goals` to update targets | Actual values auto-pull from activity_log + contact_events. |
| Today's Standings (mini leaderboard) | `GET /api/leaderboard?period=day&scope=team` | First 3 rows. |
| Today's Challenge / tier card | Derive from `/api/me` or query `/api/activity/log` GET (could add) | Returns tier + points to next tier. |
| Power List "Who to call today" | `GET /api/power-list/today` | Returns 3 contacts with hook + reason. |
| Daily Pulse / Guided check-in buttons (+10, +1, +1, +1) | `POST /api/activity/log` with `{action: "contact_block" \| "appt_set" \| "fna_complete" \| "partner_added"}` | Server returns updated tier + streak in response. |
| Session Activity log display | `GET /api/contacts/[id]/events` per contact, or aggregate via a new endpoint if you want a global timeline | |

## CRM / Contacts (`/contacts`)

| UI element | Endpoint | Notes |
|---|---|---|
| Tabs: All / Prospects / Recruits / Clients / Top 100 / Overdue | `GET /api/contacts?filter=all\|prospects\|recruits\|clients\|top_100\|overdue` | Same endpoint, different filter param. |
| Add Contact form | `POST /api/contacts` | Body matches form fields including all 7 qualifier checkboxes. |
| Contact Detail drawer (Score, Stage, Phone, Email) | `GET /api/contacts/[id]` | Returns contact + recent events + pipeline card. |
| Mark contacted button | `POST /api/contacts/[id]/events` with `{event_type: "called" \| "texted", bump_contacted: true}` | Auto-bumps `last_contacted_at` and transitions stage from uncontacted -> contacted. |
| Search bar | `GET /api/contacts?search=...` | Matches name/email/phone. |
| Seed demo button (dev only) | `scripts/seed-demo-data.ts` | Run from CLI, not exposed as an endpoint. |
| CSV upload (Idaho producer list etc.) | `POST /api/contacts/upload` (multipart) | Auto-classifies captive vs independent inline. |

## Pipeline / Kanban (`/pipeline`)

| UI element | Endpoint | Notes |
|---|---|---|
| Board load (Sales tab) | `GET /api/pipeline?board=sales` | Returns stages with their cards. |
| Board load (Recruit tab) | `GET /api/pipeline?board=recruit` | |
| Card drag/drop | `POST /api/pipeline/move` with `{card_id, to_stage_id}` | Writes pipeline_history row automatically. |
| Recruit Detail drawer | `GET /api/contacts/[id]` | Same as CRM detail. |

## Leaderboard (`/board`)

| UI element | Endpoint | Notes |
|---|---|---|
| Week / Month / All time tabs | `GET /api/leaderboard?period=week\|month\|all` | |
| Individual / Neighborhood / Competitions tabs | `GET /api/leaderboard?scope=org\|team` | "Neighborhood" can map to team or to a geo-filter later. |

## AI Coach (`/coach`)

| UI element | Endpoint | Notes |
|---|---|---|
| Chat send | `POST /api/coach/chat` with `{session_type, message, session_id?}` | Returns `{session_id, reply}`. Reuse `session_id` for the conversation. |
| Tab: Tactical | `session_type: "tactical"` | |
| Tab: All-the-Timer | `session_type: "all_the_timer"` | |
| Tab: Who to call | `session_type: "who_to_call"` | |
| Tab: Pipeline | `session_type: "pipeline"` | |

## Me / Profile (`/me`)

| UI element | Endpoint | Notes |
|---|---|---|
| Mission statement edit | `PATCH /api/onboarding` (or add `/api/me` for cleaner) | Currently you can update profiles directly via Supabase client with RLS. |
| Take Four Tendencies | `GET /api/assessments/submit?type=four_tendencies` returns questions, `POST` submits answers | Stores result on profile, used immediately by coach. |
| Take Working Genius | `GET /api/assessments/submit?type=working_genius` returns questions, `POST` submits | |
| Badges | Derive from points_ledger + contact_events (not yet built; add a /api/me/badges endpoint later) | |
| Career Track (TA -> Associate) | Derive from contact_type counts (clients, partners) | Can add `/api/me/career` later. |
| This week stats | `GET /api/weekly-goals` returns targets + actuals | |

## Manager View (menu item, leader role only)

| UI element | Endpoint | Notes |
|---|---|---|
| Team summary table | `GET /api/manager/overview` | Returns team_summary, org_totals, stuck_cards, no_activity. |
| Stuck cards alert | Read `stuck_cards` from same response | |
| "No activity this week" callout | Read `no_activity` from same response | |

## Background

| Trigger | Endpoint | Notes |
|---|---|---|
| Daily 6am Power List generation for everyone | `GET /api/cron/power-list-daily` (Vercel cron) | Configured in `vercel.json`. Auth via `CRON_SECRET`. |
| Bulk enrich a newly uploaded list | `POST /api/contacts/enrich-bulk` with `{filter: {captive: "independent"}, max: 50}` | Use after uploading a CSV to enrich the recruitable subset. |

## Suggested first wires (1 hour of Codex work)

1. Replace the demo session-storage stub in the Daily Pulse buttons with `POST /api/activity/log` calls. This makes points + streaks + leaderboard real.
2. Replace the "Power List Preview" hardcoded data with `GET /api/power-list/today`. Reuse the existing card component.
3. Wire the AI Coach chat textbox to `POST /api/coach/chat`. Show streaming or just appended message.
4. Wire CSV upload on the Contacts tab to `POST /api/contacts/upload`.

That gets the app from demo to functional in one session.
