-- Settlement void/audit status (expand-only; no column drops or renames)
--
-- ROLLOUT (apply separately, before deploying app code that depends on it):
-- 1. Review this file — additive only (ADD COLUMN IF NOT EXISTS).
-- 2. Snapshot/backup production.
-- 3. Apply + verify on staging; confirm currently deployed app still works
--    (it ignores unknown columns).
-- 4. Apply to production; verify schema and critical queries.
-- 5. Deploy application code that voids settlements instead of deleting them.
-- 6. Smoke-test create/void settlement and balance recalculation.
--
-- Compatible with deployed app that hard-deletes: new columns have defaults
-- and are unused until the new app ships.

alter table public.settlements
  add column if not exists status text not null default 'active';

alter table public.settlements
  add column if not exists voided_at timestamptz;

alter table public.settlements
  add column if not exists voided_by uuid references public.profiles(id);

alter table public.settlements
  add column if not exists void_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'settlements_status_check'
  ) then
    alter table public.settlements
      add constraint settlements_status_check
      check (status in ('active', 'voided'));
  end if;
end $$;

create index if not exists idx_settlements_group_status
  on public.settlements (group_id, status);
