-- Fix RLS policy for group_members to allow group creators to add members

-- Policy: Allow inserts if the user is the creator of the group
create policy "Group creators can add members"
on public.group_members
for insert
to authenticated
with check (
  exists (
    select 1 from public.groups
    where id = group_id
    and created_by = auth.uid()
  )
);
