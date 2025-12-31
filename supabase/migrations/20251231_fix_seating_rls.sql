-- Fix Seating RLS policies to explicitly allow Location Owners
-- This resolves issues where Organization lookup might fail or be too restrictive for direct owners.

-- 1. Update "Manage" policy for seating_maps
DROP POLICY IF EXISTS "Managers and Owners can manage seating maps" ON public.seating_maps;

CREATE POLICY "Managers and Owners can manage seating maps"
    ON public.seating_maps FOR ALL
    USING (
        exists (
            select 1 from public.employees
            where employees.user_id = auth.uid()
            and employees.location_id = seating_maps.location_id
            and employees.role in ('owner', 'manager')
            and employees.is_active = true
        )
        or
        exists (
             -- Allow Organization owners
             select 1 from public.organizations
             join public.locations on locations.organization_id = organizations.id
             where locations.id = seating_maps.location_id
             and organizations.owner_id = auth.uid()
        )
        or
        exists (
            -- Explicitly allow Location owners
            select 1 from public.locations
            where locations.id = seating_maps.location_id
            and locations.owner_id = auth.uid()
        )
    );

-- 2. Update "Read" policy for seating_maps (just in case)
DROP POLICY IF EXISTS "Employees can view seating maps" ON public.seating_maps;

CREATE POLICY "Employees can view seating maps"
    ON public.seating_maps FOR SELECT
    USING (
        exists (
            select 1 from public.employees
            where employees.user_id = auth.uid()
            and employees.location_id = seating_maps.location_id
            and employees.is_active = true
        )
        or
        exists (
             -- Allow Organization owners
             select 1 from public.organizations
             join public.locations on locations.organization_id = organizations.id
             where locations.id = seating_maps.location_id
             and organizations.owner_id = auth.uid()
        )
        or
        exists (
            -- Explicitly allow Location owners
            select 1 from public.locations
            where locations.id = seating_maps.location_id
            and locations.owner_id = auth.uid()
        )
    );

-- 3. Update "Manage" policy for seating_tables
DROP POLICY IF EXISTS "Managers and Owners can manage seating tables" ON public.seating_tables;

CREATE POLICY "Managers and Owners can manage seating tables"
    ON public.seating_tables FOR ALL
    USING (
        exists (
            select 1 from public.seating_maps
            join public.employees on employees.location_id = seating_maps.location_id
            where seating_maps.id = seating_tables.map_id
            and employees.user_id = auth.uid()
            and employees.role in ('owner', 'manager')
            and employees.is_active = true
        )
        or
        exists (
            select 1 from public.seating_maps
            join public.locations on locations.id = seating_maps.location_id
            join public.organizations on organizations.id = locations.organization_id
            where seating_maps.id = seating_tables.map_id
            and organizations.owner_id = auth.uid()
        )
        or
        exists (
            -- Explicitly allow Location owners
            select 1 from public.seating_maps
            join public.locations on locations.id = seating_maps.location_id
            where seating_maps.id = seating_tables.map_id
            and locations.owner_id = auth.uid()
        )
    );

-- 4. Update "Read" policy for seating_tables
DROP POLICY IF EXISTS "Employees can view seating tables" ON public.seating_tables;

CREATE POLICY "Employees can view seating tables"
    ON public.seating_tables FOR SELECT
    USING (
        exists (
            select 1 from public.seating_maps
            join public.employees on employees.location_id = seating_maps.location_id
            where seating_maps.id = seating_tables.map_id
            and employees.user_id = auth.uid()
            and employees.is_active = true
        )
        or
        exists (
            select 1 from public.seating_maps
            join public.locations on locations.id = seating_maps.location_id
            join public.organizations on organizations.id = locations.organization_id
            where seating_maps.id = seating_tables.map_id
            and organizations.owner_id = auth.uid()
        )
        or
        exists (
            -- Explicitly allow Location owners
            select 1 from public.seating_maps
            join public.locations on locations.id = seating_maps.location_id
            where seating_maps.id = seating_tables.map_id
            and locations.owner_id = auth.uid()
        )
    );
