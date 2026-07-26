-- Reliability: group create idempotency, admin-only invites, invite accept safety
--
-- EXPAND-ONLY / BACKWARD COMPATIBLE
-- - Adds nullable client_request_id on groups (no drops/renames).
-- - Adds unique index only when client_request_id is set (same name allowed).
-- - Tightens invite INSERT to admin/creator (does not weaken other policies).
-- - Adds atomic create_group RPC for race-safe create + membership.
--
-- ROLLOUT (do not apply from this agent to production):
-- 1. Review SQL.
-- 2. Apply on staging / local Supabase.
-- 3. Verify create-group, invite, accept-invite, expense flows.
-- 4. Apply to production, then deploy app code that depends on these objects.

-- Idempotency for duplicate group form submissions (AUTHORITATIVE guarantee).
-- App servers (including multiple Vercel isolates) must NOT use process memory
-- for exactly-once create; this unique index + create_group_atomic is the source
-- of truth across concurrent / cross-instance requests.
alter table public.groups
  add column if not exists client_request_id text;

create unique index if not exists groups_created_by_client_request_id_uidx
  on public.groups (created_by, client_request_id)
  where client_request_id is not null;

-- Atomic group create (group + admin membership in one transaction)
create or replace function public.create_group_atomic(
  p_name text,
  p_created_by uuid,
  p_client_request_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_created_by then
    raise exception 'Not authorized';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Group name is required';
  end if;

  if p_client_request_id is not null then
    select id into v_group_id
    from public.groups
    where created_by = p_created_by
      and client_request_id = p_client_request_id
    limit 1;

    if v_group_id is not null then
      return v_group_id;
    end if;
  end if;

  begin
    insert into public.groups (name, created_by, client_request_id)
    values (trim(p_name), p_created_by, p_client_request_id)
    returning id into v_group_id;
  exception
    when unique_violation then
      select id into v_group_id
      from public.groups
      where created_by = p_created_by
        and client_request_id = p_client_request_id
      limit 1;

      if v_group_id is null then
        raise;
      end if;

      return v_group_id;
  end;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, p_created_by, 'admin')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

revoke all on function public.create_group_atomic(text, uuid, text) from public;
grant execute on function public.create_group_atomic(text, uuid, text) to authenticated;

-- Invite creation: creator/admin only (server actions also enforce this)
drop policy if exists "Members can create invites" on public.invites;
drop policy if exists "Admins can create invites" on public.invites;
create policy "Admins can create invites"
  on public.invites for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      exists (
        select 1 from public.group_members gm
        where gm.group_id = invites.group_id
          and gm.user_id = auth.uid()
          and gm.role = 'admin'
      )
      or exists (
        select 1 from public.groups g
        where g.id = invites.group_id
          and g.created_by = auth.uid()
      )
    )
  );

-- Existing members accepting an invite again need an UPDATE path for upserts.
-- Keep scope narrow: users may only update their own membership row.
drop policy if exists "Members can update own membership" on public.group_members;
create policy "Members can update own membership"
  on public.group_members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
