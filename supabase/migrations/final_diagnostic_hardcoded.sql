-- FINAL COMPREHENSIVE DIAGNOSTIC (Hardcoded for User: 79e56709-95e0-48a2-84ed-83d208f07ff2)
-- This bypasses auth.uid() by hardcoding your ID to see exactly why checks are failing.

DO $$
DECLARE
    v_user_id UUID := '79e56709-95e0-48a2-84ed-83d208f07ff2';
    v_target_location_id UUID := '163ad55e-1cf3-4827-988f-ab966cceb240';
    v_target_org_id UUID := '58d56989-1b05-459e-8b3a-961f8f76a8c9';
    v_actual_org UUID;
    v_actual_owner UUID;
    v_loc_exists BOOLEAN;
    v_org_exists BOOLEAN;
BEGIN
    RAISE NOTICE '--- START DIAGNOSTIC ---';
    
    -- 1. Check if the location exists in the table
    SELECT EXISTS (SELECT 1 FROM public.locations WHERE id = v_target_location_id) INTO v_loc_exists;
    RAISE NOTICE '1. Target Location (%) exists in DB? %', v_target_location_id, v_loc_exists;
    
    -- 2. Check if the organization exists
    SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_target_org_id) INTO v_org_exists;
    RAISE NOTICE '2. Target Organization (%) exists in DB? %', v_target_org_id, v_org_exists;
    
    -- 3. If they exist, check their linkage and ownership
    IF v_loc_exists THEN
        SELECT organization_id INTO v_actual_org FROM public.locations WHERE id = v_target_location_id;
        RAISE NOTICE '3. Location is linked to Organization: %', v_actual_org;
        
        IF v_actual_org IS NOT NULL THEN
            SELECT owner_id INTO v_actual_owner FROM public.organizations WHERE id = v_actual_org;
            RAISE NOTICE '4. That Organization is owned by User: %', v_actual_owner;
            RAISE NOTICE '5. Matches current user ID (%)? %', v_user_id, (v_actual_owner = v_user_id);
        END IF;
    END IF;

    -- 6. List all locations available in the DB
    RAISE NOTICE '6. Listing up to 5 locations in the database:';
    FOR v_actual_org IN SELECT id FROM public.locations LIMIT 5 LOOP
        RAISE NOTICE '   - Found Location ID: %', v_actual_org;
    END LOOP;

    -- 7. List all organizations owned by the user
    RAISE NOTICE '7. Organizations owned by you (%) in DB:', v_user_id;
    FOR v_actual_org IN SELECT id FROM public.organizations WHERE owner_id = v_user_id LOOP
        RAISE NOTICE '   - You own Org: %', v_actual_org;
    END LOOP;

    RAISE NOTICE '--- END DIAGNOSTIC ---';
END $$;
