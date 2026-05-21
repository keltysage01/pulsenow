# Pulsenow Phase Plan

Source: product specification and build guide pasted from Perplexity on May 19, 2026.

## Current Status

Phase 1 is partially complete as a static Vite/Vercel shell:

- React/Vite static app exists.
- Vercel project exists.
- GitHub repo exists.
- Supabase environment variables were wired into the static build.
- Basic auth screen can reach Supabase after schema setup.
- Light theme is default.
- Dark mode toggle exists.
- Visible emoji characters were stripped from the current shell.

The current app is still not the final source-code architecture. It is a static handoff build that should be replaced by a normal React/Vite source app before the deeper product phases.

The complete build guide has 38 parts. Part 26 is the build-order section. The actual implementation roadmap is six build phases plus later scale work.

## Phase 1: Foundation

Spec week range: Week 1-2.

Goals:

- Scaffold React app with Vite.
- Deploy on Vercel.
- Create Supabase multi-tenant schema.
- Add authentication using email/name plus PIN flow.
- Add white-label config system.
- Add organization setup.
- Add basic routing and navigation shell.
- Add first home screen layout.

Remaining work:

- Rebuild from static export into real editable React/TypeScript source.
- Replace the temporary Supabase schema with the full UUID-based Pulsenow schema.
- Add proper auth/session handling.
- Add real white-label organization config loading.
- Finish the mobile-first home shell.
- Commit and deploy from source instead of patched compiled assets.

## Phase 2: Contacts and Pipeline

Spec week range: Week 3-4.

Goals:

- Contact import by CSV and manual entry.
- Phone contact permission request for mobile/PWA where supported.
- Business-name detection and verification flow.
- Duplicate detection and merge flow.
- Seven-qualifier scoring UI.
- Sales pipeline kanban.
- Recruit pipeline kanban.
- Recruit substep checklists.
- Manager-action notifications.

## Phase 3: Activity Tracking and Gamification

Spec week range: Week 5-6.

Goals:

- Full WealthWave activity log system.
- Plus/minus stepper controls for activity fields.
- Points calculation engine.
- Tier progression.
- Streak tracking.
- Streak shield.
- Badge and achievement system.
- Individual, team, and neighborhood leaderboards.
- Kudos/fire-up reactions.
- Weekly Monday recap.
- Daily micro-commitment.

## Phase 4: Team Feed, Vision Board, and Social

Spec week range: Week 7-8.

Goals:

- Supabase Realtime team feed.
- Auto-posts for milestones.
- Feed reactions and comments.
- Vision board photo upload.
- Dream Card creation flow.
- AI dream analysis.
- Dream detail screen.
- Completed action timeline.
- Next-step suggestions.
- Social sharing to Instagram, TikTok, Facebook, and LinkedIn.
- Branded achievement graphics.

## Phase 5: AI Features and Leadership Dashboards

Spec week range: Week 9-10.

Goals:

- Daily AI Power List.
- One-tap call/text logging flow.
- AI Coach chat interface.
- Career Track screen.
- Promotion requirement progress.
- Director analytics dashboard.
- Manager alerts.
- Licensing coordinator view.

## Phase 6: Polish and Launch

Spec week range: Week 11-12.

Goals:

- White-label onboarding wizard.
- OneSignal push notifications.
- Resend email campaigns.
- PWA configuration.
- iOS and Android browser testing.
- `app.fuelyourlegacy.com` domain setup.
- Migration plan for the existing 32 WealthWave agents.

## Scale Track

Spec range: Month 4+.

Goals:

- React Native conversion.
- App Store submission.
- Google Play submission.
- Additional white-label customers.
- Twilio dialer as a later optional phase.

## Missing From Local Docs

The pasted text contains sections 1-23 of the product specification. The screenshot shows separate Perplexity attachments named:

- `PULSENOW_MASTER.md`
- `PULSENOW_BUILD_GUIDE.md`
- `PULSENOW_SCHEMA.sql`
- `PULSENOW_SPEC.md`

The user pasted the product spec, schema, and build guide into chat. The original attachment files are still not present in this repo, but the key implementation details have been captured in:

- `docs/pulsenow-product-spec-v1.md`
- `docs/schema-implementation-notes.md`
- `docs/build-guide-summary.md`

`PULSENOW_SCHEMA.sql` was later pasted into chat and summarized in `docs/schema-implementation-notes.md`. The executable SQL still needs a cleaned canonical migration file because the pasted copy contains encoding artifacts.
