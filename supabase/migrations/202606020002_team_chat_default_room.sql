-- Let the static shell safely join the org default Team Room without exposing
-- all non-member chat groups through RLS.

create or replace function public.pulse_ensure_default_team_chat_group(p_group_name text default 'Team Room')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id text := public.pulse_auth_org_id();
  v_room_name text := coalesce(nullif(trim(p_group_name), ''), 'Team Room');
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtext('pulse_chat_default_room:' || v_org_id || ':' || v_room_name));

  select id
  into v_group_id
  from public.pulse_chat_groups
  where org_id = v_org_id
    and name = v_room_name
  order by created_at asc
  limit 1;

  if v_group_id is null then
    insert into public.pulse_chat_groups (org_id, name, creator_id)
    values (v_org_id, v_room_name, v_user_id)
    returning id into v_group_id;
  end if;

  insert into public.pulse_chat_memberships (group_id, user_id, org_id)
  values (v_group_id, v_user_id, v_org_id)
  on conflict (group_id, user_id) do update
    set updated_at = now();

  return v_group_id;
end;
$$;

revoke all on function public.pulse_ensure_default_team_chat_group(text) from public;
grant execute on function public.pulse_ensure_default_team_chat_group(text) to authenticated;
