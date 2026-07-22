-- Ensure demo seed RPC exists (expand-only / idempotent).
-- Safe to apply before or after app deploy; app also falls back to inserts
-- when this function is missing (PGRST202).

create or replace function public.seed_demo_for_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  group_id uuid;
  expense_id uuid;
begin
  if target_user is null then
    raise exception 'User id is required';
  end if;

  if auth.uid() is distinct from target_user then
    raise exception 'Not authorized';
  end if;

  insert into public.groups (name, created_by)
  values ('Demo Flatmates', target_user)
  returning id into group_id;

  insert into public.group_members (group_id, user_id, role)
  values (group_id, target_user, 'admin');

  insert into public.expenses (
    group_id, paid_by, created_by, title, description, amount, split_type, expense_date
  ) values (
    group_id, target_user, target_user, 'Weekly groceries', 'Countdown run', 85.50, 'equal', current_date
  ) returning id into expense_id;

  insert into public.expense_participants (expense_id, user_id, share_amount, share_percentage)
  values (expense_id, target_user, 85.50, 100);

  insert into public.expenses (
    group_id, paid_by, created_by, title, amount, split_type, expense_date
  ) values (
    group_id, target_user, target_user, 'Power bill', 142.00, 'equal', current_date - 7
  ) returning id into expense_id;

  insert into public.expense_participants (expense_id, user_id, share_amount)
  values (expense_id, target_user, 142.00);
end;
$$;

revoke all on function public.seed_demo_for_user(uuid) from public;
grant execute on function public.seed_demo_for_user(uuid) to authenticated;
