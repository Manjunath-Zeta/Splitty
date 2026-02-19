-- Function to log expense activities
create or replace function public.log_expense_activity()
returns trigger
language plpgsql
security definer
as $$
declare
    actor_name text;
    actor_id uuid;
    recipient_id uuid;
    participant_id text;
    split_with_array jsonb;
begin
    -- Determine Actor (User who performed the action)
    actor_id := auth.uid();
    
    -- Fallback if auth.uid() is null (e.g. server-side op), use created_by or payer_id
    if actor_id is null then
        actor_id := NEW.created_by;
    end if;

    -- Get Actor Name
    select coalesce(full_name, 'Someone') into actor_name
    from public.profiles
    where id = actor_id;

    if TG_OP = 'INSERT' then
        -- 1. Log for the Creator (User who added it)
        -- "You added 'Lunch'"
        insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description)
        values (actor_id, actor_id, 'expense', NEW.id, 'created', 'You added ''' || NEW.description || '''');

        -- 2. Log for Participants in 'split_with'
        -- split_with is JSONB array of UUIDs
        split_with_array := NEW.split_with;
        
        if split_with_array is not null then
            for participant_id in select * from jsonb_array_elements_text(split_with_array)
            loop
                -- Check if participant_id is a valid UUID (Real User) and not the actor
                if participant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
                    recipient_id := participant_id::uuid;
                    
                    if recipient_id <> actor_id then
                        insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description)
                        values (recipient_id, actor_id, 'expense', NEW.id, 'created', actor_name || ' added you to ''' || NEW.description || '''');
                    end if;
                end if;
            end loop;
        end if;
        
    elsif TG_OP = 'UPDATE' then
        -- Log update for everyone involved (Creator + Participants)
        -- For simplicity, just logging for Creator and Participants in the NEW list
        -- (Ideally should calculate diff, but this is MVP)
        
        -- Log for Actor
        -- insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description)
        -- values (actor_id, actor_id, 'expense', NEW.id, 'updated', 'You updated ''' || NEW.description || '''');

        -- TODO: Updates can be noisy. Let's skip update logs for now to keep it clean, or just log important ones.
        -- User requested "changes made by other users".
        -- If Actor != Creator, log for Creator.
        
        if NEW.created_by <> actor_id then
             insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description)
             values (NEW.created_by, actor_id, 'expense', NEW.id, 'updated', actor_name || ' updated ''' || NEW.description || '''');
        end if;

    elsif TG_OP = 'DELETE' then
        -- Log for participants that the expense was deleted?
        -- Hard to access participants if OLD record. 
        -- Skipping DELETE logs for now to avoid complexity with accessing OLD.split_with
    end if;

    return null;
end;
$$;

-- Function to log group member additions
create or replace function public.log_group_member_activity()
returns trigger
language plpgsql
security definer
as $$
declare
    actor_name text;
    actor_id uuid;
    group_name text;
begin
    actor_id := auth.uid();
    if actor_id is null then return null; end if;

    -- Get Actor Name
    select coalesce(full_name, 'Someone') into actor_name
    from public.profiles
    where id = actor_id;

    -- Get Group Name
    select name into group_name from public.groups where id = NEW.group_id;

    if TG_OP = 'INSERT' then
        -- If I added someone else
        if NEW.user_id <> actor_id then
             insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description)
             values (NEW.user_id, actor_id, 'group', NEW.group_id, 'added_member', actor_name || ' added you to group ''' || group_name || '''');
        end if;
    end if;

    return null;
end;
$$;

-- Create Triggers
drop trigger if exists on_expense_activity on public.expenses;
create trigger on_expense_activity
    after insert or update on public.expenses
    for each row execute procedure public.log_expense_activity();

drop trigger if exists on_group_member_activity on public.group_members;
create trigger on_group_member_activity
    after insert on public.group_members
    for each row execute procedure public.log_group_member_activity();
