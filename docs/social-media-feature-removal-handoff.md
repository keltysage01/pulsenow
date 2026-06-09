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

- Team tab and Team chat.
- Supabase `pulse_chat_*` chat foundation.
- Contact Intelligence LinkedIn/social research, because that is CRM enrichment and not the in-app social feed.

## Product State

Team communication is now the single team-facing surface:

- Bottom nav `Team` still opens the chat screen.
- Drawer now labels that route as `Team Chat`.
- Team chat supports local preview fallback and Supabase-backed persistence when configured.

The Today page should no longer show story circles, social composer affordances, or social-feed cards.

## Database Notes

The repo removed the historical social feed migrations:

- `202605290001_social_posts.sql`
- `202605300003_social_post_media_items.sql`

For already-provisioned Supabase projects, apply:

- `supabase/migrations/202606090001_drop_social_feed.sql`

That migration drops `public.social_posts` if present. Contact Intelligence tables such as `contact_social_profiles` are intentionally untouched.

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
