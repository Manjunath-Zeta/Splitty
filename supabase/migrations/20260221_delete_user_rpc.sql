-- Migration: Delete User Account
-- Description: Adds a secure RPC function to allow users to fully delete their own account from the auth.users table.
-- Because many tables (profiles, friends, groups, etc.) have foreign keys referencing auth.users cascade deletes
-- should automatically clean up associated data.

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    requesting_user_id uuid;
BEGIN
    -- Get the UID of the user making the request
    requesting_user_id := auth.uid();

    -- Ensure a user is actually logged in and making the request
    IF requesting_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete the user from auth.users.
    -- Assuming foreign keys with ON DELETE CASCADE are set up, this will wipe their data.
    DELETE FROM auth.users WHERE id = requesting_user_id;

END;
$$;
