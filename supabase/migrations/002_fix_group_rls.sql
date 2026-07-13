-- Fix RLS policies that block group creation and profile bootstrap

-- Creators must be able to read groups they just created (before membership row exists)
drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());

-- Users can create their own profile if the auth trigger did not run
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- Members can always see their own membership rows
drop policy if exists "Members can view group membership" on public.group_members;
create policy "Members can view group membership"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id) or user_id = auth.uid());

-- Invitees can read invites sent to them or open link invites
drop policy if exists "Members can view group invites" on public.invites;
create policy "Members can view group invites"
  on public.invites for select to authenticated
  using (
    public.is_group_member(group_id)
    or accepted_by = auth.uid()
    or (
      accepted_by is null
      and (
        email is null
        or lower(email) = lower((select email from public.profiles where id = auth.uid()))
      )
    )
  );
