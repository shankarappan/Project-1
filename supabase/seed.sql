-- Demo seed data for Lets Split
-- IMPORTANT: Replace user UUIDs with real auth.users IDs after creating test accounts.
-- This script is meant to be adapted once you have signed in at least once.

-- Example: after signing in with magic link, find your user id:
-- select id, email from auth.users;

-- Uncomment and replace placeholders below:

/*
-- Demo users (create via Supabase Auth first, then update profiles)
-- User A: replace with your primary test user UUID
-- User B/C: create additional test users or use the same user for solo demo

do $$
declare
  user_a uuid := '00000000-0000-0000-0000-000000000001';
  user_b uuid := '00000000-0000-0000-0000-000000000002';
  user_c uuid := '00000000-0000-0000-0000-000000000003';
  group_id uuid;
  expense_id uuid;
begin
  insert into public.profiles (id, email, full_name)
  values
    (user_a, 'alice@example.com', 'Alice'),
    (user_b, 'bob@example.com', 'Bob'),
    (user_c, 'charlie@example.com', 'Charlie')
  on conflict (id) do nothing;

  insert into public.groups (name, created_by)
  values ('Weekend Trip', user_a)
  returning id into group_id;

  insert into public.group_members (group_id, user_id, role)
  values
    (group_id, user_a, 'admin'),
    (group_id, user_b, 'member'),
    (group_id, user_c, 'member');

  insert into public.expenses (
    group_id, paid_by, created_by, title, amount, split_type, expense_date
  ) values (
    group_id, user_a, user_a, 'Groceries', 120.00, 'equal', current_date - 2
  ) returning id into expense_id;

  insert into public.expense_participants (expense_id, user_id, share_amount, share_percentage)
  values
    (expense_id, user_a, 40.00, 33.33),
    (expense_id, user_b, 40.00, 33.33),
    (expense_id, user_c, 40.00, 33.34);

  insert into public.expenses (
    group_id, paid_by, created_by, title, amount, split_type, expense_date
  ) values (
    group_id, user_b, user_b, 'Dinner', 90.00, 'equal', current_date - 1
  ) returning id into expense_id;

  insert into public.expense_participants (expense_id, user_id, share_amount)
  values
    (expense_id, user_a, 30.00),
    (expense_id, user_b, 30.00),
    (expense_id, user_c, 30.00);

  insert into public.settlements (
    group_id, payer_id, receiver_id, amount, note, created_by
  ) values (
    group_id, user_c, user_a, 20.00, 'Cash for groceries', user_c
  );
end $$;
*/

-- Quick solo demo: seeds a group for the first authenticated user
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

grant execute on function public.seed_demo_for_user(uuid) to authenticated;
