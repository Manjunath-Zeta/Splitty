-- Create Activity Logs Table
create table if not exists public.activity_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null, -- The user who sees this
    actor_id uuid references public.profiles(id) on delete set null, -- The user who did the action
    entity_type text not null, -- 'expense', 'group', 'settlement'
    entity_id uuid not null,
    action text not null, -- 'created', 'updated', 'deleted', 'added_member'
    description text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_read boolean default false
);

-- Enable RLS
alter table public.activity_logs enable row level security;

-- Policy: Users can view their own logs
create policy "Users can view their own activity logs"
    on public.activity_logs for select
    using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table activity_logs;
