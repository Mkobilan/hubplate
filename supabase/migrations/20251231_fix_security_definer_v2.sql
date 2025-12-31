-- Fix the SECURITY DEFINER function using CREATE OR REPLACE
-- This avoids the dependency issue

CREATE OR REPLACE FUNCTION public.user_can_manage_seating_for_location(loc_id uuid)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
    v_org_id uuid;
    v_org_owner_id uuid;
    v_location_owner_id uuid;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    -- Check 1: Is user an active employee with manager/owner role?
    IF EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = v_user_id
        AND employees.location_id = loc_id
        AND employees.role IN ('owner', 'manager', 'gm', 'agm')
        AND employees.is_active = true
    ) THEN
        RETURN true;
    END IF;

    -- Check 2: Is user the direct location owner?
    SELECT owner_id INTO v_location_owner_id
    FROM public.locations
    WHERE id = loc_id;
    
    IF v_location_owner_id = v_user_id THEN
        RETURN true;
    END IF;

    -- Check 3: Is user the organization owner?
    -- Get the organization_id from the location
    SELECT organization_id INTO v_org_id
    FROM public.locations
    WHERE id = loc_id;
    
    IF v_org_id IS NOT NULL THEN
        -- Get the organization owner_id
        SELECT owner_id INTO v_org_owner_id
        FROM public.organizations
        WHERE id = v_org_id;
        
        IF v_org_owner_id = v_user_id THEN
            RETURN true;
        END IF;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, pg_temp;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_can_manage_seating_for_location(uuid) TO authenticated;

-- Test the function
SELECT 
    'Function test after fix' as test,
    public.user_can_manage_seating_for_location('163ad55e-1cf3-4827-988f-ab966cceb240') as can_manage;
