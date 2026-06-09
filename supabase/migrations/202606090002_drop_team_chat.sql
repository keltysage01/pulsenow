-- Remove the retired PulseNow group chat foundation.

drop function if exists public.pulse_ensure_default_team_chat_group(text);
drop table if exists public.pulse_chat_attachments cascade;
drop table if exists public.pulse_chat_messages cascade;
drop table if exists public.pulse_chat_memberships cascade;
drop table if exists public.pulse_chat_groups cascade;
drop type if exists public.pulse_chat_attachment_type;
