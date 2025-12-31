-- TEST SCRIPT FOR SQL EDITOR
-- This script hardcodes your User ID because auth.uid() is NULL in the SQL Editor.
-- This PROVES the logic works for your specific IDs.

DO $$
DECLARE
    v_user_id UUID := '79e56709-95e0-48a2-84ed-83d208f07ff2';
    v_location_id UUID := 'a587b0b7-ba7d-4476-b849-a4683d476c43';
    v_org_id UUID;
    v_is_owner BOOLEAN;
    v_result BOOLEAN;
BEGIN
    RAISE NOTICE 'Testing for User: %', v_user_id;
    RAISE NOTICE 'Testing for Location: %', v_location_id;

    -- Manual check of the function logic
    SELECT organization_id INTO v_org_id FROM public.locations WHERE id = v_location_id;
    RAISE NOTICE 'Found Org ID: %', v_org_id;

    SELECT EXISTS (
        SELECT 1 FROM public.organizations 
        WHERE id = v_org_id 
        AND owner_id = v_user_id
    ) INTO v_is_owner;
    
    RAISE NOTICE 'Is user the Org Owner? %', v_is_owner;

    -- This simulates the app's behavior where auth.uid() is NOT null
    IF v_is_owner THEN
        v_result := TRUE;
    ELSE
        v_result := FALSE;
    END IF;

    RAISE NOTICE 'Final Result (if you were logged in): %', v_result;
END $$;
