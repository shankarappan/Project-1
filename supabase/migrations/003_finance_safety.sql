-- Financial safety: idempotency keys, settlement mutations, atomic expense RPCs

-- Idempotency for duplicate form submissions
alter table public.expenses
  add column if not exists client_request_id text;

alter table public.settlements
  add column if not exists client_request_id text;

create unique index if not exists expenses_created_by_client_request_id_uidx
  on public.expenses (created_by, client_request_id)
  where client_request_id is not null;

create unique index if not exists settlements_created_by_client_request_id_uidx
  on public.settlements (created_by, client_request_id)
  where client_request_id is not null;

-- Settlement update/delete (members of the group)
drop policy if exists "Members can update settlements" on public.settlements;
create policy "Members can update settlements"
  on public.settlements for update to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

drop policy if exists "Members can delete settlements" on public.settlements;
create policy "Members can delete settlements"
  on public.settlements for delete to authenticated
  using (public.is_group_member(group_id));

-- Atomic expense create (expense + participants in one transaction)
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
  p_client_request_id text,
  p_participants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id uuid;
  v_existing uuid;
  v_participant jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_created_by then
    raise exception 'Not authorized';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'Not a group member';
  end if;

  if p_client_request_id is not null then
    select id into v_existing
    from public.expenses
    where created_by = p_created_by
      and client_request_id = p_client_request_id
    limit 1;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  insert into public.expenses (
    group_id, paid_by, created_by, title, description,
    amount, currency, split_type, expense_date, client_request_id
  ) values (
    p_group_id, p_paid_by, p_created_by, p_title, p_description,
    p_amount, p_currency, p_split_type, p_expense_date, p_client_request_id
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
  uuid, uuid, uuid, text, text, numeric, text, text, date, text, jsonb
) from public;
grant execute on function public.create_expense_atomic(
  uuid, uuid, uuid, text, text, numeric, text, text, date, text, jsonb
) to authenticated;

-- Atomic expense replace (update + replace participants)
create or replace function public.update_expense_atomic(
  p_expense_id uuid,
  p_group_id uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_paid_by uuid,
  p_split_type text,
  p_expense_date date,
  p_participants jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'Not a group member';
  end if;

  update public.expenses
  set
    title = p_title,
    description = p_description,
    amount = p_amount,
    paid_by = p_paid_by,
    split_type = p_split_type,
    expense_date = p_expense_date
  where id = p_expense_id
    and group_id = p_group_id;

  if not found then
    raise exception 'Expense not found';
  end if;

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
end;
$$;

revoke all on function public.update_expense_atomic(
  uuid, uuid, text, text, numeric, uuid, text, date, jsonb
) from public;
grant execute on function public.update_expense_atomic(
  uuid, uuid, text, text, numeric, uuid, text, date, jsonb
) to authenticated;
