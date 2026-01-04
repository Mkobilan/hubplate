-- Migration: Performance Cleanup Part 2
-- Description: Consolidates Public vs Internal permissive policies for menu and location tables.

-- 1. FIX LOCATIONS
DROP POLICY IF EXISTS "consolidated_locations_select" ON public.locations;

CREATE POLICY "consolidated_locations_select" ON public.locations
FOR SELECT TO anon, authenticated
USING (
    (ordering_enabled = true)
    OR 
    (
        (select auth.role()) = 'authenticated' AND (
            owner_id = (select auth.uid())
            OR organization_id IN (SELECT org_id FROM public.get_my_organizations())
        )
    )
);

-- 2. FIX MENU_CATEGORIES
DROP POLICY IF EXISTS "consolidated_menu_categories_select" ON public.menu_categories;

CREATE POLICY "consolidated_menu_categories_select" ON public.menu_categories
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = menu_categories.location_id
        AND locations.ordering_enabled = true
    )
    OR 
    (
        (select auth.role()) = 'authenticated' AND (
            location_id IN (
                SELECT id FROM public.locations 
                WHERE owner_id = (select auth.uid()) 
                OR organization_id IN (SELECT org_id FROM public.get_my_organizations())
            )
        )
    )
);

-- 3. FIX MENU_ITEMS
DROP POLICY IF EXISTS "consolidated_menu_items_select" ON public.menu_items;

CREATE POLICY "consolidated_menu_items_select" ON public.menu_items
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = menu_items.location_id
        AND locations.ordering_enabled = true
    )
    OR 
    (
        (select auth.role()) = 'authenticated' AND (
            location_id IN (
                SELECT id FROM public.locations 
                WHERE owner_id = (select auth.uid()) 
                OR organization_id IN (SELECT org_id FROM public.get_my_organizations())
            )
        )
    )
);

-- 4. FIX ADD_ONS
DROP POLICY IF EXISTS "consolidated_add_ons_select" ON public.add_ons;

CREATE POLICY "consolidated_add_ons_select" ON public.add_ons
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = add_ons.location_id
        AND locations.ordering_enabled = true
    )
    OR 
    (
        (select auth.role()) = 'authenticated' AND (
            location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (select auth.uid())
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (select auth.uid())
            )
        )
    )
);

-- 5. FIX ADD_ON_CATEGORY_ASSIGNMENTS
DROP POLICY IF EXISTS "consolidated_add_on_category_assignments_select" ON public.add_on_category_assignments;

CREATE POLICY "consolidated_add_on_category_assignments_select" ON public.add_on_category_assignments
FOR SELECT TO anon, authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.menu_categories
        JOIN public.locations ON locations.id = menu_categories.location_id
        WHERE menu_categories.id = add_on_category_assignments.category_id
        AND locations.ordering_enabled = true
    )
    OR 
    (
        (select auth.role()) = 'authenticated' AND (
            add_on_id IN (
                SELECT ao.id FROM public.add_ons ao 
                WHERE ao.location_id IN (
                    SELECT e.location_id FROM public.employees e WHERE e.user_id = (select auth.uid())
                    UNION
                    SELECT l.id FROM public.locations l WHERE l.owner_id = (select auth.uid())
                )
            )
        )
    )
);
