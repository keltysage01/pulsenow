-- Remove the retired PulseNow social feed storage.
-- Team communication now lives in pulse_chat_* tables.

drop table if exists public.social_posts cascade;
