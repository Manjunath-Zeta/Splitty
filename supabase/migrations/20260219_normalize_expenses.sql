-- Create Expense Participants Table (Normalized Schema)
create table if not exists expense_participants (
    id uuid default gen_random_uuid() primary key,
    expense_id uuid references expenses(id) on delete cascade not null,
    
    -- A participant is EITHER a registered user (profile) OR a local friend (friend)
    profile_id uuid references profiles(id),
    friend_id uuid references friends(id),
    
    amount numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Ensure we link to exactly one type of entity per row (or "self" handling via profile_id)
    constraint participant_check check (
        (profile_id is not null and friend_id is null) or 
        (profile_id is null and friend_id is not null)
    ),
    
    -- Prevent duplicate entries for the same person in the same expense
    constraint unique_participant_per_expense unique nulls not distinct (expense_id, profile_id, friend_id)
);

-- RLS Policies
alter table expense_participants enable row level security;

-- Policy 1: View Participants
create policy "Participants viewable by expense visibility" on expense_participants
    for select using (
        exists (
            select 1 from expenses e
            where e.id = expense_participants.expense_id
            -- Re-use existing expense visibility logic
            and (
                e.created_by = auth.uid() or 
                e.payer_id = auth.uid() or
                (e.group_id is not null and public.is_group_member(e.group_id, auth.uid())) or
                e.split_with @> jsonb_build_array(auth.uid()) -- Legacy fallback / specific share
            )
        )
    );

-- Policy 2: Insert Participants (Only expense creator/payer can do this typically, simplifying to creator for now)
create policy "Creators can insert participants" on expense_participants
    for insert with check (
        exists (
            select 1 from expenses e
            where e.id = expense_id
            and (e.created_by = auth.uid() or e.payer_id = auth.uid())
        )
    );

-- Policy 3: Update Participants
create policy "Creators can update participants" on expense_participants
    for update using (
        exists (
            select 1 from expenses e
            where e.id = expense_id
            and (e.created_by = auth.uid() or e.payer_id = auth.uid())
        )
    );

-- Policy 4: Delete Participants
create policy "Creators can delete participants" on expense_participants
    for delete using (
        exists (
            select 1 from expenses e
            where e.id = expense_id
            and (e.created_by = auth.uid() or e.payer_id = auth.uid())
        )
    );

-- Enable Realtime
alter publication supabase_realtime add table expense_participants;


-- DATA MIGRATION CHECK
-- This block will iterate over existing expenses and populate the new table used the JSON data.
do $$
declare
    r record;
    key text;
    val numeric;
    p_id uuid;
    f_id uuid;
begin
    for r in select * from expenses where split_details is not null loop
        
        -- Iterate over the JSON keys (which are IDs)
        for key, val in select * from jsonb_each_text(r.split_details) loop
            p_id := null;
            f_id := null;
            
            -- Validation: Ensure key is a valid UUID
            if key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
                
                 -- Attempt to map key to Profile OR Friend
                if exists(select 1 from profiles where id = key::uuid) then
                    p_id := key::uuid;
                elsif exists(select 1 from friends where id = key::uuid) then
                    f_id := key::uuid;
                end if;

                -- If valid mapping found, insert into new table
                if (p_id is not null or f_id is not null) then
                    insert into expense_participants (expense_id, profile_id, friend_id, amount)
                    values (r.id, p_id, f_id, val)
                    on conflict (expense_id, profile_id, friend_id) do update
                    set amount = excluded.amount; -- Update amount if already exists (idempotent)
                end if;
            end if;
        end loop;
    end loop;
end;
$$;
