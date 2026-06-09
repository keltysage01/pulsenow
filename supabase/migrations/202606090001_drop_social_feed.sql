-- Remove the retired PulseNow social feed storage.

drop table if exists public.social_posts cascade;
