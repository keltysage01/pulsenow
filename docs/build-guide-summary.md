# Pulsenow Build Guide Summary

Source: `PULSENOW_BUILD_GUIDE.md` pasted from the Perplexity handoff on May 19, 2026.

## Document Shape

The build guide contains 38 parts, not 26 total parts. Part 26 is the build order and priorities section.

Key later parts:

- Part 26: Build Order and Priorities
- Part 27: Environment Variables
- Part 28: Supabase Helpers
- Part 29: Component File Structure
- Part 30: Critical Do Nots
- Part 31: First Session Deliverable
- Part 32: Supabase Setup Checklist
- Part 33: Vercel Deployment Checklist
- Part 34: Migration Plan for Existing 32 Agents
- Part 35: Testing Requirements
- Part 36: What AI Assistants Should Build First
- Part 37: Prompting Tips
- Part 38: Scalability Notes

## Confirmed Technical Direction

- Build a brand-new React + Vite codebase.
- Use Tailwind CSS for styling.
- Use React Router v6.
- Use Supabase JS client.
- Use a new Supabase project, not the existing WealthWave project.
- Use Vercel for hosting.
- Use OneSignal for push notifications.
- Use Resend for email.
- Use Claude through a Vercel serverless proxy.
- Use sessionStorage for custom PIN auth.
- Do not use Supabase Auth/OAuth for the main app login.
- Do not expose Anthropic API keys in client-side code.

## Phase Plan From Part 26

### Phase 1: Foundation

Deliverables:

- Vite React project scaffold.
- Supabase client.
- Org config context.
- Custom PIN auth.
- Bottom navigation shell.
- Hamburger menu.
- Placeholder routes.
- Home screen sections with placeholder or empty states.
- Vercel deploy.
- Mobile browser validation.

### Phase 2: Core Data Features

Deliverables:

- Log screen with all fields and point calculation.
- Contacts screen with import flow.
- Qualifier scoring.
- Sales pipeline kanban.
- Recruit pipeline kanban.
- Substep checklists.
- Manager action notifications.

### Phase 3: Gamification

Deliverables:

- Individual, team, and neighborhood leaderboards.
- Badge checking and awards.
- Competitions.
- Streak tracking and shield.
- Weekly recap.
- Kudos system.

### Phase 4: AI Features

Deliverables:

- AI Power List.
- Vision board with Dream Card.
- AI dream analysis.
- Dream Detail screen.
- AI Coach chat.
- Career track progress bars.
- Promotion notifications.

### Phase 5: Social and Sharing

Deliverables:

- Team feed using Supabase Realtime.
- Auto-posts for milestones.
- Social sharing graphics.
- Web Share API integration.

### Phase 6: Communications and Polish

Deliverables:

- OneSignal push notifications.
- Resend email campaigns.
- PWA manifest and install prompt.
- White-label onboarding wizard.
- Director analytics dashboard.

## First Session Deliverable

The first coding session should produce:

1. Vite React project created and running locally.
2. Tailwind configured with org color CSS variables.
3. Supabase client connected and tested.
4. Login screen functional with PIN auth and sessionStorage.
5. App shell with bottom nav rendering placeholder screens.
6. Home screen layout rendering placeholder sections.
7. Vercel deployment at a working URL.
8. Mobile browser access.

## Environment Variables

Client-side Vite variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ONESIGNAL_APP_ID`
- `VITE_DEFAULT_ORG_SLUG`

Server-side only variables:

- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`

The pasted guide listed `VITE_ANTHROPIC_API_KEY` and `VITE_RESEND_API_KEY`, but it also explicitly says Anthropic must not be exposed to the client. Treat server-side API keys as non-`VITE_` Vercel env vars.

## Critical Do Nots

- Do not use Twilio or VoIP for agent calls.
- Do not change the WealthWave tier system.
- Do not use localStorage for auth.
- Do not hardcode org-specific values.
- Do not use nested template literals.
- Do not expose Anthropic API key client-side.
- Do not request push permission on page load.
- Do not build in-app team chat; keep the center mobile tab on AI Coach.
- Do not use GoHighLevel for this product.

## Supabase Setup Checklist

- Create new Supabase project.
- Run cleaned Pulsenow schema.
- Verify tables and seed data.
- Create public buckets: `avatars`, `vision-board`, `org-logos`.
- Enable Realtime on `feed_posts`.
- Enable Realtime on `notifications`.
- Add Supabase URL and anon key to local and Vercel env vars.
- Test by querying `organizations`.

## Vercel Checklist

- Push code to GitHub.
- Connect GitHub repo to Vercel.
- Set all environment variables.
- Add custom domain later.
- Test HTTPS.
- Test iPhone Safari and Android Chrome.
- Verify PWA prompt.

## Testing Rule

No phase is complete until it is tested on:

- iPhone Safari
- Android Chrome

Critical flows include auth, home, log, pipeline, contacts, gamification, vision board, sharing, and notifications.
