-- Fix Expense Activity Logging & RLS for Participants
-- 1. Comprehensive trigger for INSERT, UPDATE, DELETE with category metadata
-- 2. RLS policy update to allow participants to UPDATE expenses

-- ============================================================
-- 1. Replace log_expense_activity() with comprehensive version
-- ============================================================

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
    old_split_with_array jsonb;
    group_name text;
    metadata_json jsonb;
    participant_names text[];
    resolved_payer_name text;
    action_type text;
    description_text text;
    notified_ids uuid[] := '{}';
begin
    -- Determine Actor and target record
    actor_id := auth.uid();

    if TG_OP = 'DELETE' then
        target_record := OLD;
        if actor_id is null then actor_id := OLD.created_by; end if;
        action_type := 'deleted';
        description_text := 'deleted expense ''' || OLD.description || '''';
        split_with_array := OLD.split_with;
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
        split_with_array := NEW.split_with;
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
        select coalesce(full_name, email, 'Someone') into resolved_payer_name
        from public.profiles where id = target_record.payer_id;
    end if;
    if resolved_payer_name is null or resolved_payer_name = 'Someone' then
        resolved_payer_name := target_record.payer_name;
    end if;

    -- Build Metadata (now includes category)
    metadata_json := jsonb_build_object(
        'amount', target_record.amount,
        'currency', 'USD',
        'category', target_record.category,
        'payer_name', resolved_payer_name,
        'group_name', group_name,
        'split_type', target_record.split_type,
        'participants', participant_names
    );

    -- =====================================================
    -- LOG FOR THE ACTOR (always)
    -- =====================================================
    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
    values (actor_id, actor_id, 'expense', target_record.id, action_type, 'You ' || description_text, metadata_json);
    notified_ids := notified_ids || actor_id;

    -- =====================================================
    -- LOG FOR ALL PARTICIPANTS in split_with (current)
    -- =====================================================
    if split_with_array is not null then
        for participant_id in select * from jsonb_array_elements_text(split_with_array)
        loop
            if participant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
                recipient_id := participant_id::uuid;
                if not (recipient_id = any(notified_ids)) then
                    insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
                    values (recipient_id, actor_id, 'expense', target_record.id, action_type, actor_name || ' ' || description_text, metadata_json);
                    notified_ids := notified_ids || recipient_id;
                end if;
            end if;
        end loop;
    end if;

    -- =====================================================
    -- ON UPDATE: Also notify participants from OLD split_with
    -- (in case participants were removed from the expense)
    -- =====================================================
    if TG_OP = 'UPDATE' then
        old_split_with_array := OLD.split_with;
        if old_split_with_array is not null then
            for participant_id in select * from jsonb_array_elements_text(old_split_with_array)
            loop
                if participant_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
                    recipient_id := participant_id::uuid;
                    if not (recipient_id = any(notified_ids)) then
                        insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
                        values (recipient_id, actor_id, 'expense', target_record.id, action_type, actor_name || ' ' || description_text, metadata_json);
                        notified_ids := notified_ids || recipient_id;
                    end if;
                end if;
            end loop;
        end if;
    end if;

    -- =====================================================
    -- LOG FOR CREATOR (if not already notified)
    -- =====================================================
    if target_record.created_by is not null and not (target_record.created_by = any(notified_ids)) then
        insert into public.activity_logs (user_id, actor_id, entity_type, entity_id, action, description, metadata)
        values (target_record.created_by, actor_id, 'expense', target_record.id, action_type, actor_name || ' ' || description_text, metadata_json);
    end if;

    return null;
end;
$$;

-- Re-create the trigger for INSERT, UPDATE, and DELETE
drop trigger if exists on_expense_activity on public.expenses;
create trigger on_expense_activity
    after insert or update or delete
    on public.expenses
    for each row
    execute function public.log_expense_activity();


-- ============================================================
-- 2. Update RLS: Allow participants in split_with to UPDATE
-- ============================================================

-- Drop the existing restrictive update policy
drop policy if exists "Users can update their expenses." on expenses;

-- Create new policy: creator OR participants can update
create policy "Users can update their expenses." on expenses
    for update using (
        auth.uid() = created_by
        or split_with @> jsonb_build_array(auth.uid()::text)
    );
