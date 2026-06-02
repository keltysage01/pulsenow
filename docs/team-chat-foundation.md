# PulseNow Team Chat Foundation

PulseNow already stores app users as Supabase Auth users with profile rows in `public.profiles`.
For the GroupMe-style MVP, `profiles` is the user table:

```sql
select id, phone, email, full_name as name, avatar_url
from public.profiles;
```

The chat migration is `supabase/migrations/202606020001_team_chat_foundation.sql`.
The default room helper is `supabase/migrations/202606020002_team_chat_default_room.sql`.

## Tables

- `pulse_chat_groups`: team rooms with `name`, `creator_id`, `image_url`, and `share_token`.
- `pulse_chat_memberships`: strict many-to-many join between profiles and groups with `nickname` and `is_muted`.
- `pulse_chat_messages`: committed chat messages with `group_id`, `user_id`, `text`, and `created_at`.
- `pulse_chat_attachments`: message attachments with enum `type` values of `image`, `location`, or `emoji`, plus JSONB `data`.

## Indexing Strategy

The main chat log query should be:

```sql
select *
from public.pulse_chat_messages
where group_id = $1
order by created_at desc, id desc
limit 50;
```

That query is covered by:

```sql
create index pulse_chat_messages_group_created_idx
on public.pulse_chat_messages(group_id, created_at desc, id desc);
```

The extra `id desc` gives stable pagination when multiple messages share the same timestamp.
Membership lookups use `pulse_chat_memberships_user_idx` for "my rooms" and `pulse_chat_memberships_org_user_idx` for RLS/member checks.

## Backend Shape

## Static Shell Integration

The root `index.html` shell now uses the Supabase browser client directly for the Team tab:

- Calls `pulse_ensure_default_team_chat_group('Team Room')` for the signed-in profile.
- Loads the latest 50 `pulse_chat_messages` for that group.
- Inserts new messages into `pulse_chat_messages` with optimistic UI.
- Falls back to local preview storage if Supabase is unavailable or the user is in demo mode.

The helper is `security definer` because RLS intentionally prevents non-members from discovering chat groups. It finds or creates the org's default `Team Room`, joins the current authenticated profile, then normal message reads/writes use the table policies.

If PulseNow later splits real-time chat into a dedicated Node service, keep the service modular:

```text
backend/
  src/
    app.ts
    server.ts
    config/
      env.ts
      redis.ts
      supabase.ts
    modules/
      groups/
        groups.controller.ts
        groups.repository.ts
        groups.routes.ts
        groups.types.ts
      memberships/
        memberships.controller.ts
        memberships.repository.ts
        memberships.routes.ts
      messages/
        messages.controller.ts
        messages.repository.ts
        messages.routes.ts
        message-events.publisher.ts
      attachments/
        attachments.controller.ts
        attachments.routes.ts
        s3-presign.service.ts
      realtime/
        socket-server.ts
        room-presence.service.ts
        redis-subscriber.ts
    middleware/
      require-auth.ts
      request-context.ts
    db/
      pool.ts
      migrations/
    tests/
```

REST should own durable state changes: creating groups, updating memberships, committing messages, and issuing short-lived S3 pre-signed URLs.
WebSockets should own ephemeral events: typing, read presence, room join/leave, and broadcasting committed message events received through Redis Pub/Sub.
