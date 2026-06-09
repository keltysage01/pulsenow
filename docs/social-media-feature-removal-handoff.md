# Social Media Feature Removal Handoff

Date: 2026-06-09

## Scope

The old PulseNow social-media feature has been removed from the shipped static shell and repo artifacts.

Removed:

- Today story rail.
- Today social/team-room preview card.
- Wins/Stories drawer label.
- Social post composer state and handlers.
- Local social post seed/storage logic.
- Social post media assets under `public/social-assets`.
- Social feed Supabase migrations for `social_posts` and social post media fields.

Kept:

- AI Coach as the center mobile tab.
- Contact Intelligence LinkedIn/social research, because that is CRM enrichment and not the in-app social feed.

## Product State

The in-app social and team-chat surfaces are now removed:

- Bottom nav `Coach` opens AI Coach.
- The drawer keeps `AI Coach` and no longer exposes Team Chat.
- There is no Team messages composer, seed feed, or local chat fallback.

The Today page should no longer show story circles, social composer affordances, or social-feed cards.

## Database Notes

The repo removed the historical social feed migrations:

- `202605290001_social_posts.sql`
- `202605300003_social_post_media_items.sql`

For already-provisioned Supabase projects, apply:

- `supabase/migrations/202606090001_drop_social_feed.sql`
- `supabase/migrations/202606090002_drop_team_chat.sql`

Those migrations drop `public.social_posts` and any `pulse_chat_*` chat foundation objects if present. Contact Intelligence tables such as `contact_social_profiles` are intentionally untouched.

## Verification Checklist

Run from the current PulseNow repo:

```bash
npm run build
rg -n "social_posts|social-story|social-assets|Wins & Stories|hydrateSocialPosts|createSocialPost" index.html scripts supabase docs public
```

Expected:

- Build passes.
- No shipped static-shell references to social posts, story rails, or social assets.
- Contact Intelligence social/LinkedIn research references may still exist.

## Follow-Up

If production Supabase migrations are applied manually, confirm `public.social_posts` is gone in Supabase after applying the drop migration.
