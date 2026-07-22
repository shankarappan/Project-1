-- Expand-only: allow group creators/admins to delete groups.
-- Related rows (members, expenses, settlements, invites) cascade via FK.

drop policy if exists "Group admins can delete groups" on public.groups;

create policy "Group admins can delete groups"
  on public.groups for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = id
        and gm.user_id = auth.uid()
        and gm.role = 'admin'
    )
  );
