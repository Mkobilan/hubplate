-- Debug version of the function with RAISE NOTICE to see what's happening
CREATE OR REPLACE FUNCTION public.user_can_manage_seating_for_location_debug(loc_id uuid)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_org_owner_id uuid;
    v_location_owner_id uuid;
    v_has_employee boolean;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    RAISE NOTICE 'User ID: %', v_user_id;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User ID is NULL - not authenticated';
        RETURN false;
    END IF;

    -- Check 1: Is user an active employee with manager/owner role?
    SELECT EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = v_user_id
        AND employees.location_id = loc_id
        AND employees.role IN ('owner', 'manager', 'gm', 'agm')
        AND employees.is_active = true
    ) INTO v_has_employee;
    
    RAISE NOTICE 'Has employee access: %', v_has_employee;
    
    IF v_has_employee THEN
        RAISE NOTICE 'Returning TRUE - user is employee';
        RETURN true;
    END IF;

    -- Check 2: Is user the direct location owner?
    SELECT owner_id INTO v_location_owner_id
    FROM public.locations
    WHERE id = loc_id;
    
    RAISE NOTICE 'Location owner_id: %, User is location owner: %', v_location_owner_id, (v_location_owner_id = v_user_id);
    
    IF v_location_owner_id = v_user_id THEN
        RAISE NOTICE 'Returning TRUE - user is location owner';
        RETURN true;
    END IF;

    -- Check 3: Is user the organization owner?
    SELECT organization_id INTO v_org_id
    FROM public.locations
    WHERE id = loc_id;
    
    RAISE NOTICE 'Organization ID from location: %', v_org_id;
    
    IF v_org_id IS NOT NULL THEN
        SELECT owner_id INTO v_org_owner_id
        FROM public.organizations
        WHERE id = v_org_id;
        
        RAISE NOTICE 'Organization owner_id: %, User is org owner: %', v_org_owner_id, (v_org_owner_id = v_user_id);
        
        IF v_org_owner_id = v_user_id THEN
            RAISE NOTICE 'Returning TRUE - user is org owner';
            RETURN true;
        END IF;
    ELSE
        RAISE NOTICE 'Organization ID is NULL';
    END IF;

    RAISE NOTICE 'Returning FALSE - no access found';
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, pg_temp;

-- Test the debug function
SELECT public.user_can_manage_seating_for_location_debug('163ad55e-1cf3-4827-988f-ab966cceb240');
