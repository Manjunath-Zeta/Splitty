-- Comprehensive Activity Logging Migration
-- Covers INSERT, UPDATE, DELETE for Expenses, Groups, and Friends.

-- 1. EXPENSES: Handle INSERT, UPDATE, DELETE
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
    target_record record;
    split_with_array jsonb;
    group_name text;
    metadata_json jsonb;
    participant_names text[];
    resolved_payer_name text;
    action_type text;
    description_text text;
begin
    -- Determine Actor and Record
    actor_id := auth.uid();
    
    if TG_OP = 'DELETE' then
        target_record := OLD;
        if actor_id is null then actor_id := OLD.created_by; end if;
        action_type := 'deleted';
        description_text := 'deleted expense ''' || OLD.description || '''';
    else
        target_record := NEW;
        if actor_id is null then actor_id := NEW.created_by; end if;
        if TG_OP = 'INSERT' then
            action_type := 'created';
            description_text := 'added ''' || NEW.description || '''';
        else
            action_type := 'updated';
            description_text := 'updated ''' || NEW.description || '''';
        end if;
    end if;

    -- Get Actor Name
    select coalesce(full_name, email, 'Someone') into actor_name
    from public.profiles
    where id = actor_id;

    -- Get Group Name
    if target_record.group_id is not null then
        select name into group_name from public.groups where id = target_record.group_id;
    end if;

    -- Resolve Participant Names
    split_with_array := target_record.split_with;
    if split_with_array is not null then
       select array_agg(coalesce(full_name, 'Unknown'))
       into participant_names
       from public.profiles
       where id in (
           select value::uuid 
           from jsonb_array_elements_text(split_with_array) 
           where value ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       );
    end if;

    -- Resolve Payer Name
    if target_record.payer_id is not null then
        select coalesce(full_name, email, 'Someone') into resolved_payer_name from public.profiles where id = target_record.payer_id;
    end if;
    if resolved_payer_name is null or resolved_payer_name = 'Someone' then
        resolved_payer_name := target_record.payer_name;
    end if;

    -- Build Metadata
    metadata_json := jsonb_build_object(
        'amount', target_record.amount,
        'currency', 'USD',
        'payer_name', resolved_payer_name,
        'group_name', group_name,
        'split_type', target_record.split_type,
        'participants', participant_names
    );

    -- 1. Log for the Actor
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
    values (actor_id, actor_id, 'expense', target_record.id, action_type, 'You ' || description_text, metadata_json);

    -- 2. Log for Participants
    if split_with_array is not null then
        for participant_id in select * from jsonb_array_elements_text(split_with_array)
        loop
            if participant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
                recipient_id := participant_id::uuid;
                if recipient_id <> actor_id then
                    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
                    values (recipient_id, actor_id, 'expense', target_record.id, action_type, actor_name || ' ' || description_text, metadata_json);
                end if;
            end if;
        end loop;
    end if;
    
    -- 3. Log for Creator (if actor is not creator, e.g. someone else updated/deleted)
    if target_record.created_by <> actor_id then
         insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
         values (target_record.created_by, actor_id, 'expense', target_record.id, action_type, actor_name || ' ' || description_text, metadata_json);
    end if;

    return null;
end;
$$;

-- Apply Trigger for DELETE (INSERT/UPDATE already exists? Re-applying ensures coverage)
drop trigger if exists on_expense_activity on public.expenses;
create trigger on_expense_activity
    after insert or update or delete
    on public.expenses
    for each row
    execute function public.log_expense_activity();


-- 2. FRIENDS: Handle DELETE
create or replace function public.log_friend_activity()
returns trigger
language plpgsql
security definer
as $$
declare
    actor_id uuid;
    friend_name text;
begin
    if TG_OP = 'DELETE' then
        actor_id := OLD.user_id; -- The user who owned the friend row
        friend_name := OLD.name;
        
        insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
        values (actor_id, actor_id, 'friend', OLD.id, 'deleted', 'You removed friend ''' || friend_name || '''', jsonb_build_object('friend_name', friend_name));
    end if;
    return null;
end;
$$;

drop trigger if exists on_friend_delete on public.friends;
create trigger on_friend_delete
    after delete
    on public.friends
    for each row
    execute function public.log_friend_activity();


-- 3. GROUPS: Handle UPDATE (Name)
create or replace function public.log_group_updates()
returns trigger
language plpgsql
security definer
as $$
declare
    actor_id uuid;
    actor_name text;
    member_id uuid;
begin
    if TG_OP = 'UPDATE' and OLD.name <> NEW.name then
        actor_id := auth.uid();
        select coalesce(full_name, 'Someone') into actor_name from public.profiles where id = actor_id;

        -- Notify all members
        for member_id in select user_id from public.group_members where group_id = NEW.id
        loop
            if member_id = actor_id then
                 insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
                 values (member_id, actor_id, 'group', NEW.id, 'updated', 'You renamed group ''' || OLD.name || ''' to ''' || NEW.name || '''', jsonb_build_object('group_name', NEW.name));
            else
                 insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
                 values (member_id, actor_id, 'group', NEW.id, 'updated', actor_name || ' renamed group ''' || OLD.name || ''' to ''' || NEW.name || '''', jsonb_build_object('group_name', NEW.name));
            end if;
        end loop;
    end if;
    return null;
end;
$$;

drop trigger if exists on_group_update on public.groups;
create trigger on_group_update
    after update
    on public.groups
    for each row
    execute function public.log_group_updates();


-- 4. GROUP MEMBERS: Handle INSERT/DELETE
create or replace function public.log_group_member_activity()
returns trigger
language plpgsql
security definer
as $$
declare
    actor_name text;
    actor_id uuid;
    group_name text;
    metadata_json jsonb;
    target_record record;
    action_type text;
    target_user_id uuid;
    target_group_id uuid;
begin
    actor_id := auth.uid();
    if actor_id is null then return null; end if;

    if TG_OP = 'DELETE' then
        target_record := OLD;
        target_user_id := OLD.user_id;
        target_group_id := OLD.group_id;
        action_type := 'removed_member';
    else
        target_record := NEW;
        target_user_id := NEW.user_id;
        target_group_id := NEW.group_id;
        action_type := 'added_member';
    end if;

    select coalesce(full_name, 'Someone') into actor_name from public.profiles where id = actor_id;
    select name into group_name from public.groups where id = target_group_id;

    metadata_json := jsonb_build_object('group_name', group_name);

    if TG_OP = 'INSERT' then
        if target_user_id <> actor_id then
             insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
             values (target_user_id, actor_id, 'group', target_group_id, action_type, actor_name || ' added you to group ''' || group_name || '''', metadata_json);
        end if;
    elsif TG_OP = 'DELETE' then
        if target_user_id = actor_id then
             insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
             values (target_user_id, actor_id, 'group', target_group_id, 'left_group', 'You left group ''' || group_name || '''', metadata_json);
        else
             insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
             values (target_user_id, actor_id, 'group', target_group_id, action_type, actor_name || ' removed you from group ''' || group_name || '''', metadata_json);
        end if;
    end if;

    return null;
end;
$$;

drop trigger if exists on_group_member_activity on public.group_members;
create trigger on_group_member_activity
    after insert or delete
    on public.group_members
    for each row
    execute function public.log_group_member_activity();
