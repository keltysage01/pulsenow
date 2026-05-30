-- Store uploaded photo/video metadata for social feed posts when the
-- social_posts table is present in the target project.

do $$
begin
  if to_regclass('public.social_posts') is not null then
    alter table public.social_posts
      add column if not exists media_items jsonb not null default '[]'::jsonb;
  end if;
end;
$$;
