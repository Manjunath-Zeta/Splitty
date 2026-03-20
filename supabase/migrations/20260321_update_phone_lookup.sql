CREATE OR REPLACE FUNCTION public.lookup_user_by_phone(search_phone text)
RETURNS jsonb AS $$
DECLARE
  found_user RECORD;
  normalized_search text;
BEGIN
  -- Strip all non-numeric characters and take the right-most 10 digits
  normalized_search := RIGHT(regexp_replace(search_phone, '\D', '', 'g'), 10);
  
  -- If there were fewer than 10 digits, or no digits at all, abort early
  IF length(normalized_search) < 5 THEN
    RETURN NULL;
  END IF;

  SELECT id, full_name, avatar_url, phone
  INTO found_user
  FROM profiles
  WHERE RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) = normalized_search
  LIMIT 1;

  IF FOUND THEN
    RETURN row_to_json(found_user)::jsonb;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
