-- Fix missing relationship between expenses and expense_participants

-- 1. Ensure table exists (idempotent)
create table if not exists public.expense_participants (
    id uuid default gen_random_uuid() primary key,
    expense_id uuid not null,
    profile_id uuid references public.profiles(id),
    friend_id uuid references public.friends(id),
    amount numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ensure Foreign Key exists
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expense_participants_expense_id_fkey') then
    alter table public.expense_participants
    add constraint expense_participants_expense_id_fkey
    foreign key (expense_id) references public.expenses(id) on delete cascade;
  end if;
end;
$$;

-- 3. Enable RLS if not already enabled
alter table public.expense_participants enable row level security;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
