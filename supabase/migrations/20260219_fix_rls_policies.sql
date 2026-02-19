-- Add missing RLS policies for expense_participants table

-- 1. Allow Viewing: If user can see the expense, they can see the participants
create policy "Participants viewable by expense visibility" on expense_participants
    for select using (
        exists (
            select 1 from expenses e
            where e.id = expense_participants.expense_id
            and (
                e.created_by = auth.uid() or 
                e.payer_id = auth.uid() or
                (e.group_id is not null and public.is_group_member(e.group_id, auth.uid())) or
                e.split_with @> jsonb_build_array(auth.uid())
            )
        )
    );

-- 2. Allow Inserting: Only creators or payers can add participants
create policy "Creators can insert participants" on expense_participants
    for insert with check (
        exists (
            select 1 from expenses e
            where e.id = expense_id
            and (e.created_by = auth.uid() or e.payer_id = auth.uid())
        )
    );

-- 3. Allow Updating: Only creators or payers can modify participants
create policy "Creators can update participants" on expense_participants
    for update using (
        exists (
            select 1 from expenses e
            where e.id = expense_id
            and (e.created_by = auth.uid() or e.payer_id = auth.uid())
        )
    );

-- 4. Allow Deleting: Only creators or payers can remove participants
create policy "Creators can delete participants" on expense_participants
    for delete using (
        exists (
            select 1 from expenses e
            where e.id = expense_id
            and (e.created_by = auth.uid() or e.payer_id = auth.uid())
        )
    );
