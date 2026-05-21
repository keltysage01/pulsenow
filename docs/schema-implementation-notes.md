# Pulsenow Schema Implementation Notes

Source: `PULSENOW_SCHEMA.sql` pasted from the Perplexity handoff on May 19, 2026.

## Important Compatibility Warning

The full Pulsenow schema uses `uuid` IDs for `organizations.id` and related foreign keys:

- `organizations.id uuid`
- `users.org_id uuid`
- `contacts.org_id uuid`
- `pipeline_stages.org_id uuid`
- most other tenant-scoped records use `org_id uuid`

The temporary schema used during early Vercel/Supabase setup used a text organization ID such as `default-fyl`.

Because of that, the full schema should not be layered on top of the temporary schema with `create table if not exists`. PostgreSQL will keep the old table definitions and later statements can fail or create an inconsistent database.

## Recommended Path For This Early Project

Because Pulsenow is still in setup and does not yet have production user data, the cleanest option is:

1. Back up anything important from Supabase if needed.
2. Drop the temporary Pulsenow tables.
3. Run the full schema from a clean database state.
4. Re-seed the Fuel Your Legacy organization.
5. Update the frontend auth code to expect UUID `org_id` values.

## Tables Included In Full Schema

The pasted schema includes the product-critical database foundation:

- Organizations
- Users
- Vision board items
- Dream AI actions
- Dream actions
- Contacts
- Contact interactions
- Pipeline stages
- Pipeline substeps
- Contact journeys
- Journey history
- Substep completions
- Activity logs
- Leaderboard
- Career levels
- Promotion requirements
- Weekly goals
- Badge definitions
- Badge awards
- Competitions
- Feed posts
- Feed reactions
- Feed comments
- Notifications
- Kudos
- Campaigns
- Campaign steps
- Campaign enrollments
- Organization settings
- Power list cache

## RPC Functions Included

- `upsert_activity_log`
- `upsert_leaderboard`
- `get_downline`
- `get_rolling_stats`

## Data Quality Issues In The Pasted Copy

The pasted SQL contains mojibake characters from encoding conversion. Before committing it as executable SQL, clean:

- Decorative comment separators
- Curly arrows and long dashes that rendered incorrectly
- Emoji values in seed data
- Any text fields that show broken character sequences

The SQL structure is still usable, but the executable file should be cleaned before being treated as the canonical migration.

