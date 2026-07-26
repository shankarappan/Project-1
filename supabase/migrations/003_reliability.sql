-- Reliability + security: idempotency, invite join RPC, tightened membership RLS,
-- atomic expense create/update.
--
-- EXPAND-ONLY / BACKWARD COMPATIBLE relative to 001/002 (no drops of columns).
-- This file is the single not-yet-applied migration — edit in place until applied.
--
-- ROLLOUT (do not apply from this agent to production):
-- 1. Review SQL.
-- 2. Apply on staging / local Supabase.
-- 3. Verify create-group, invite accept, expense create/update, malicious-client denials.
-- 4. Apply to production, then deploy app code that depends on these objects.

-- ---------------------------------------------------------------------------
-- Group create idempotency (AUTHORITATIVE; not process memory)
-- ---------------------------------------------------------------------------
alter table public.groups
  add column if not exists client_request_id text;

create unique index if not exists groups_created_by_client_request_id_uidx
  on public.groups (created_by, client_request_id)
  where client_request_id is not null;

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

-- ---------------------------------------------------------------------------
-- Invites: admin/creator create only
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- CRITICAL: remove self-promotion UPDATE policy (never ship this).
-- accept_invite is SECURITY DEFINER and does not need member UPDATE.
-- ---------------------------------------------------------------------------
drop policy if exists "Members can update own membership" on public.group_members;

-- ---------------------------------------------------------------------------
-- CRITICAL: close invite bypass / arbitrary membership insert from 001.
-- Joining is only via accept_invite RPC (or create_group_atomic for creator).
-- Narrow direct INSERT: group creator may add only themselves as admin
-- (fallback when create_group_atomic is unavailable).
-- ---------------------------------------------------------------------------
drop policy if exists "Members can add members when creating group or via invite"
  on public.group_members;
drop policy if exists "Creators can add themselves as admin"
  on public.group_members;

create policy "Creators can add themselves as admin"
  on public.group_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.created_by = auth.uid()
    )
  );

-- Atomic invite accept: validate token/expiry/email/unused, insert member, mark accepted
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.invites%rowtype;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_token is null or length(trim(p_token)) = 0 then
    raise exception 'Invite not found or already used';
  end if;

  select * into v_invite
  from public.invites
  where invite_token = trim(p_token)
  for update;

  if not found then
    raise exception 'Invite not found or already used';
  end if;

  if v_invite.accepted_by is not null then
    raise exception 'Invite not found or already used';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'This invite has expired';
  end if;

  if v_invite.email is not null then
    select lower(email) into v_email from public.profiles where id = v_uid;
    if v_email is null or v_email <> lower(v_invite.email) then
      raise exception 'Invite email mismatch';
    end if;
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, v_uid, 'member')
  on conflict (group_id, user_id) do nothing;

  update public.invites
  set accepted_by = v_uid
  where id = v_invite.id
    and accepted_by is null;

  return v_invite.group_id;
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic expense create / update (expense + participants in one transaction)
-- ---------------------------------------------------------------------------
create or replace function public.create_expense_atomic(
  p_group_id uuid,
  p_paid_by uuid,
  p_created_by uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_split_type text,
  p_expense_date date,
  p_participants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id uuid;
  v_participant jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_created_by then
    raise exception 'Not authorized';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'Not a group member';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  if p_participants is null or jsonb_array_length(p_participants) = 0 then
    raise exception 'Select at least one participant';
  end if;

  -- Payer and every participant must be group members
  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_paid_by
  ) then
    raise exception 'Payer and participants must be members of this group';
  end if;

  for v_participant in select * from jsonb_array_elements(p_participants)
  loop
    if not exists (
      select 1 from public.group_members
      where group_id = p_group_id
        and user_id = (v_participant->>'user_id')::uuid
    ) then
      raise exception 'Payer and participants must be members of this group';
    end if;
  end loop;

  insert into public.expenses (
    group_id, paid_by, created_by, title, description,
    amount, currency, split_type, expense_date
  ) values (
    p_group_id, p_paid_by, p_created_by, trim(p_title), p_description,
    p_amount, coalesce(p_currency, 'NZD'), p_split_type,
    coalesce(p_expense_date, current_date)
  )
  returning id into v_expense_id;

  for v_participant in select * from jsonb_array_elements(p_participants)
  loop
    insert into public.expense_participants (
      expense_id, user_id, share_amount, share_percentage
    ) values (
      v_expense_id,
      (v_participant->>'user_id')::uuid,
      (v_participant->>'share_amount')::numeric,
      nullif(v_participant->>'share_percentage', '')::numeric
    );
  end loop;

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense_atomic(
  uuid, uuid, uuid, text, text, numeric, text, text, date, jsonb
) from public;
grant execute on function public.create_expense_atomic(
  uuid, uuid, uuid, text, text, numeric, text, text, date, jsonb
) to authenticated;

create or replace function public.update_expense_atomic(
  p_expense_id uuid,
  p_group_id uuid,
  p_paid_by uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_split_type text,
  p_expense_date date,
  p_participants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant jsonb;
  v_existing_group uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'Not a group member';
  end if;

  select group_id into v_existing_group
  from public.expenses
  where id = p_expense_id;

  if v_existing_group is null or v_existing_group <> p_group_id then
    raise exception 'Expense not found';
  end if;

  if p_participants is null or jsonb_array_length(p_participants) = 0 then
    raise exception 'Select at least one participant';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_paid_by
  ) then
    raise exception 'Payer and participants must be members of this group';
  end if;

  for v_participant in select * from jsonb_array_elements(p_participants)
  loop
    if not exists (
      select 1 from public.group_members
      where group_id = p_group_id
        and user_id = (v_participant->>'user_id')::uuid
    ) then
      raise exception 'Payer and participants must be members of this group';
    end if;
  end loop;

  update public.expenses
  set
    title = trim(p_title),
    description = p_description,
    amount = p_amount,
    paid_by = p_paid_by,
    split_type = p_split_type,
    expense_date = p_expense_date
  where id = p_expense_id;

  delete from public.expense_participants where expense_id = p_expense_id;

  for v_participant in select * from jsonb_array_elements(p_participants)
  loop
    insert into public.expense_participants (
      expense_id, user_id, share_amount, share_percentage
    ) values (
      p_expense_id,
      (v_participant->>'user_id')::uuid,
      (v_participant->>'share_amount')::numeric,
      nullif(v_participant->>'share_percentage', '')::numeric
    );
  end loop;

  return p_expense_id;
end;
$$;

revoke all on function public.update_expense_atomic(
  uuid, uuid, uuid, text, text, numeric, text, date, jsonb
) from public;
grant execute on function public.update_expense_atomic(
  uuid, uuid, uuid, text, text, numeric, text, date, jsonb
) to authenticated;
