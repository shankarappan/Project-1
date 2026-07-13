-- Lets Split database schema
-- Run in Supabase SQL Editor or via supabase db push

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Groups
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null
);

-- Group members
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'member' not null,
  joined_at timestamptz default now() not null,
  unique(group_id, user_id)
);

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  paid_by uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  title text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  currency text default 'NZD' not null,
  split_type text not null check (split_type in ('equal','exact','percentage')),
  expense_date date not null default current_date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Expense participants
create table if not exists public.expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(12,2) not null default 0,
  share_percentage numeric(5,2),
  unique(expense_id, user_id)
);

-- Settlements
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  payer_id uuid not null references public.profiles(id),
  receiver_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text default 'NZD' not null,
  note text,
  settled_at timestamptz default now() not null,
  created_by uuid not null references public.profiles(id),
  check (payer_id <> receiver_id)
);

-- Invites
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  email text,
  invite_token text unique not null,
  created_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_expenses_group on public.expenses(group_id);
create index if not exists idx_expense_participants_expense on public.expense_participants(expense_id);
create index if not exists idx_settlements_group on public.settlements(group_id);
create index if not exists idx_invites_token on public.invites(invite_token);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger for expenses
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- Helper: is group member
create or replace function public.is_group_member(group_uuid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = group_uuid and user_id = auth.uid()
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;
alter table public.settlements enable row level security;
alter table public.invites enable row level security;

-- Profiles policies
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Groups policies
create policy "Members can view their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "Authenticated users can create groups"
  on public.groups for insert to authenticated
  with check (auth.uid() = created_by);

create policy "Group creators can update groups"
  on public.groups for update to authenticated
  using (created_by = auth.uid());

-- Group members policies
create policy "Members can view group membership"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

create policy "Members can add members when creating group or via invite"
  on public.group_members for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_group_member(group_id)
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

create policy "Members can leave groups"
  on public.group_members for delete to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()
  ));

-- Expenses policies
create policy "Members can view group expenses"
  on public.expenses for select to authenticated
  using (public.is_group_member(group_id));

create policy "Members can create expenses"
  on public.expenses for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy "Members can update expenses"
  on public.expenses for update to authenticated
  using (public.is_group_member(group_id));

create policy "Members can delete expenses"
  on public.expenses for delete to authenticated
  using (public.is_group_member(group_id));

-- Expense participants policies
create policy "Members can view expense participants"
  on public.expense_participants for select to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and public.is_group_member(e.group_id)
  ));

create policy "Members can manage expense participants"
  on public.expense_participants for all to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and public.is_group_member(e.group_id)
  ))
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_id and public.is_group_member(e.group_id)
  ));

-- Settlements policies
create policy "Members can view settlements"
  on public.settlements for select to authenticated
  using (public.is_group_member(group_id));

create policy "Members can record settlements"
  on public.settlements for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

-- Invites policies
create policy "Members can view group invites"
  on public.invites for select to authenticated
  using (public.is_group_member(group_id) or accepted_by = auth.uid());

create policy "Members can create invites"
  on public.invites for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

create policy "Anyone authenticated can accept invite by token"
  on public.invites for update to authenticated
  using (accepted_by is null)
  with check (accepted_by = auth.uid());
