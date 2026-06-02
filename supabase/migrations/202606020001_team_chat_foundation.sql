-- PulseNow team chat foundation.
-- The existing app stores users in auth.users + public.profiles, so these
-- chat tables reference profiles instead of creating a second user table.

create extension if not exists pgcrypto;

do $$
begin
  create type public.pulse_chat_attachment_type as enum ('image', 'location', 'emoji');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.pulse_chat_groups (
  id uuid primary key default gen_random_uuid(),
  org_id text not null default public.pulse_auth_org_id(),
  name text not null,
  creator_id uuid references public.profiles(id) on delete set null,
  image_url text,
  share_token text not null default encode(gen_random_bytes(18), 'base64'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pulse_chat_groups_share_token_unique unique (share_token)
);

create table if not exists public.pulse_chat_memberships (
  group_id uuid references public.pulse_chat_groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  org_id text not null default public.pulse_auth_org_id(),
  nickname text,
  is_muted boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.pulse_chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.pulse_chat_groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pulse_chat_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.pulse_chat_messages(id) on delete cascade not null,
  type public.pulse_chat_attachment_type not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pulse_chat_groups_org_created_idx
on public.pulse_chat_groups(org_id, created_at desc);

create index if not exists pulse_chat_groups_creator_idx
on public.pulse_chat_groups(creator_id, created_at desc);

create index if not exists pulse_chat_memberships_user_idx
on public.pulse_chat_memberships(user_id, joined_at desc);

create index if not exists pulse_chat_memberships_org_user_idx
on public.pulse_chat_memberships(org_id, user_id);

create index if not exists pulse_chat_messages_group_created_idx
on public.pulse_chat_messages(group_id, created_at desc, id desc);

create index if not exists pulse_chat_messages_user_created_idx
on public.pulse_chat_messages(user_id, created_at desc);

create index if not exists pulse_chat_attachments_message_idx
on public.pulse_chat_attachments(message_id);

alter table public.pulse_chat_groups enable row level security;
alter table public.pulse_chat_memberships enable row level security;
alter table public.pulse_chat_messages enable row level security;
alter table public.pulse_chat_attachments enable row level security;

drop policy if exists "pulse_chat_groups member read" on public.pulse_chat_groups;
create policy "pulse_chat_groups member read"
on public.pulse_chat_groups for select
using (
  org_id = public.pulse_auth_org_id()
  and exists (
    select 1 from public.pulse_chat_memberships m
    where m.group_id = pulse_chat_groups.id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "pulse_chat_groups creator insert" on public.pulse_chat_groups;
create policy "pulse_chat_groups creator insert"
on public.pulse_chat_groups for insert
with check (
  creator_id = auth.uid()
  and org_id = public.pulse_auth_org_id()
);

drop policy if exists "pulse_chat_groups creator update" on public.pulse_chat_groups;
create policy "pulse_chat_groups creator update"
on public.pulse_chat_groups for update
using (creator_id = auth.uid())
with check (
  creator_id = auth.uid()
  and org_id = public.pulse_auth_org_id()
);

drop policy if exists "pulse_chat_memberships org read" on public.pulse_chat_memberships;
create policy "pulse_chat_memberships org read"
on public.pulse_chat_memberships for select
using (org_id = public.pulse_auth_org_id());

drop policy if exists "pulse_chat_memberships self insert" on public.pulse_chat_memberships;
create policy "pulse_chat_memberships self insert"
on public.pulse_chat_memberships for insert
with check (
  user_id = auth.uid()
  and org_id = public.pulse_auth_org_id()
);

drop policy if exists "pulse_chat_memberships self update" on public.pulse_chat_memberships;
create policy "pulse_chat_memberships self update"
on public.pulse_chat_memberships for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and org_id = public.pulse_auth_org_id()
);

drop policy if exists "pulse_chat_messages member read" on public.pulse_chat_messages;
create policy "pulse_chat_messages member read"
on public.pulse_chat_messages for select
using (
  exists (
    select 1 from public.pulse_chat_memberships m
    where m.group_id = pulse_chat_messages.group_id
      and m.user_id = auth.uid()
      and m.org_id = public.pulse_auth_org_id()
  )
);

drop policy if exists "pulse_chat_messages member insert" on public.pulse_chat_messages;
create policy "pulse_chat_messages member insert"
on public.pulse_chat_messages for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.pulse_chat_memberships m
    where m.group_id = pulse_chat_messages.group_id
      and m.user_id = auth.uid()
      and m.org_id = public.pulse_auth_org_id()
  )
);

drop policy if exists "pulse_chat_attachments member read" on public.pulse_chat_attachments;
create policy "pulse_chat_attachments member read"
on public.pulse_chat_attachments for select
using (
  exists (
    select 1
    from public.pulse_chat_messages msg
    join public.pulse_chat_memberships m on m.group_id = msg.group_id
    where msg.id = pulse_chat_attachments.message_id
      and m.user_id = auth.uid()
      and m.org_id = public.pulse_auth_org_id()
  )
);

drop policy if exists "pulse_chat_attachments sender insert" on public.pulse_chat_attachments;
create policy "pulse_chat_attachments sender insert"
on public.pulse_chat_attachments for insert
with check (
  exists (
    select 1
    from public.pulse_chat_messages msg
    where msg.id = pulse_chat_attachments.message_id
      and msg.user_id = auth.uid()
  )
);

grant select, insert, update on public.pulse_chat_groups to authenticated;
grant select, insert, update on public.pulse_chat_memberships to authenticated;
grant select, insert on public.pulse_chat_messages to authenticated;
grant select, insert on public.pulse_chat_attachments to authenticated;
