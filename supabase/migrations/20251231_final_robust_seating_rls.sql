-- FINAL ROBUST RLS FIX for Seating
-- This script ensures organization owners have full access to seating_maps and seating_tables.

-- 1. Re-create the permission check function to be extremely robust
CREATE OR REPLACE FUNCTION public.can_manage_seating(loc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_is_owner BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN FALSE; END IF;

    -- Check 1: User is owner/manager in employees table
    IF EXISTS (
        SELECT 1 FROM public.employees 
        WHERE user_id = v_user_id 
        AND location_id = loc_id 
        AND role IN ('owner', 'manager', 'gm', 'agm')
        AND is_active = TRUE
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check 2: User is direct location owner
    IF EXISTS (
        SELECT 1 FROM public.locations 
        WHERE id = loc_id 
        AND owner_id = v_user_id
    ) THEN
        RETURN TRUE;
    END IF;

    -- Check 3: User is organization owner
    -- We select the org_id from the location first
    SELECT organization_id INTO v_org_id FROM public.locations WHERE id = loc_id;
    IF v_org_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = v_org_id 
            AND owner_id = v_user_id
        ) THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply policies to seating_maps
ALTER TABLE public.seating_maps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Owners can manage seating maps" ON public.seating_maps;
DROP POLICY IF EXISTS "Employees can view seating maps" ON public.seating_maps;

CREATE POLICY "Seating maps management" ON public.seating_maps
    FOR ALL TO authenticated
    USING (can_manage_seating(location_id));

CREATE POLICY "Seating maps selection" ON public.seating_maps
    FOR SELECT TO authenticated
    USING (
        can_manage_seating(location_id) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() 
            AND location_id = seating_maps.location_id 
            AND is_active = TRUE
        )
    );

-- 3. Apply policies to seating_tables
ALTER TABLE public.seating_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers and Owners can manage seating tables" ON public.seating_tables;
DROP POLICY IF EXISTS "Employees can view seating tables" ON public.seating_tables;

CREATE POLICY "Seating tables management" ON public.seating_tables
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.seating_maps
            WHERE id = seating_tables.map_id
            AND can_manage_seating(location_id)
        )
    );

CREATE POLICY "Seating tables selection" ON public.seating_tables
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.seating_maps
            WHERE id = seating_tables.map_id
            AND (
                can_manage_seating(location_id) OR
                EXISTS (
                    SELECT 1 FROM public.employees 
                    WHERE user_id = auth.uid() 
                    AND location_id = seating_maps.location_id 
                    AND is_active = TRUE
                )
            )
        )
    );

-- 4. Verification Test (Directly check for your IDs)
-- Replace the IDs below if they ever change
SELECT 
    'Verification Check' as test,
    can_manage_seating('a587b0b7-ba7d-4476-b849-a4683d476c43') as can_manage_the_real_location;
