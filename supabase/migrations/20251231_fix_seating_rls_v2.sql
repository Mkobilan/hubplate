-- Fix: Allow seating_maps RLS policies to read organizations table
-- The issue is that the seating_maps policy tries to check organization ownership,
-- but the organizations table RLS is blocking that read.

-- Solution: Add a SECURITY DEFINER function to safely check permissions
-- This bypasses RLS while still being secure because it only returns a boolean

CREATE OR REPLACE FUNCTION public.user_can_manage_seating_for_location(loc_id uuid)
RETURNS boolean AS $$
BEGIN
    -- Check if user is an active employee with manager/owner role
    IF EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.location_id = loc_id
        AND employees.role IN ('owner', 'manager')
        AND employees.is_active = true
    ) THEN
        RETURN true;
    END IF;

    -- Check if user is the direct location owner
    IF EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = loc_id
        AND locations.owner_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;

    -- Check if user owns the organization that owns this location
    IF EXISTS (
        SELECT 1 FROM public.locations
        JOIN public.organizations ON organizations.id = locations.organization_id
        WHERE locations.id = loc_id
        AND organizations.owner_id = auth.uid()
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Now update the seating_maps policies to use this function

DROP POLICY IF EXISTS "Managers and Owners can manage seating maps" ON public.seating_maps;
DROP POLICY IF EXISTS "Employees can view seating maps" ON public.seating_maps;

CREATE POLICY "Managers and Owners can manage seating maps"
    ON public.seating_maps FOR ALL
    USING (user_can_manage_seating_for_location(location_id));

CREATE POLICY "Employees can view seating maps"
    ON public.seating_maps FOR SELECT
    USING (
        user_can_manage_seating_for_location(location_id)
        OR
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.location_id = seating_maps.location_id
            AND employees.is_active = true
        )
    );

-- Update seating_tables policies similarly
DROP POLICY IF EXISTS "Managers and Owners can manage seating tables" ON public.seating_tables;
DROP POLICY IF EXISTS "Employees can view seating tables" ON public.seating_tables;

CREATE POLICY "Managers and Owners can manage seating tables"
    ON public.seating_tables FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.seating_maps
            WHERE seating_maps.id = seating_tables.map_id
            AND user_can_manage_seating_for_location(seating_maps.location_id)
        )
    );

CREATE POLICY "Employees can view seating tables"
    ON public.seating_tables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.seating_maps
            WHERE seating_maps.id = seating_tables.map_id
            AND (
                user_can_manage_seating_for_location(seating_maps.location_id)
                OR
                EXISTS (
                    SELECT 1 FROM public.employees
                    WHERE employees.user_id = auth.uid()
                    AND employees.location_id = seating_maps.location_id
                    AND employees.is_active = true
                )
            )
        )
    );
