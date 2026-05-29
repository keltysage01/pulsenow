-- PulseNow social feed: team wins, field stories, and shoutouts.
-- Idempotent and safe to run after the core profile/org schema exists.

create table if not exists social_posts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations on delete cascade not null,
  profile_id uuid references profiles on delete set null,
  type text not null default 'win' check (type in ('win', 'story', 'shoutout')),
  title text not null,
  body text not null,
  author_name text not null,
  author_level text,
  reactions jsonb not null default '{"fire":0,"congrats":0,"inspired":0}'::jsonb,
  visibility text not null default 'team' check (visibility in ('team', 'org')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_org_created_idx on social_posts(org_id, created_at desc);
create index if not exists social_posts_profile_created_idx on social_posts(profile_id, created_at desc);
create index if not exists social_posts_type_idx on social_posts(type);

alter table social_posts enable row level security;

drop policy if exists "social_posts org read" on social_posts;
create policy "social_posts org read"
on social_posts for select
using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.org_id = social_posts.org_id
  )
);

drop policy if exists "social_posts owner insert" on social_posts;
create policy "social_posts owner insert"
on social_posts for insert
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.org_id = social_posts.org_id
  )
);

drop policy if exists "social_posts owner update" on social_posts;
create policy "social_posts owner update"
on social_posts for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

grant select, insert, update on social_posts to authenticated;
