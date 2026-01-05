-- Migration: 20260105_fix_menu_rls.sql
-- Fixes RLS policies for menu_items and menu_categories to allow managers/gms/agms to manage them.

-- 1. MENU_CATEGORIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Users can manage menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Public can view categories for enabled locations" ON public.menu_categories;
DROP POLICY IF EXISTS "menu_categories_select" ON public.menu_categories;
DROP POLICY IF EXISTS "menu_categories_all" ON public.menu_categories;

-- Select policy: Employees at location OR Restaurant Owner OR Organization Owner OR Public (if enabled)
CREATE POLICY "menu_categories_select" ON public.menu_categories
    FOR SELECT TO anon, authenticated
    USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
        OR EXISTS (
            SELECT 1 FROM public.locations
            WHERE locations.id = menu_categories.location_id
            AND locations.ordering_enabled = true
        )
    );

-- Manage policies (INSERT/UPDATE/DELETE): Owners, Managers, GMs, AGMs
CREATE POLICY "menu_categories_insert" ON public.menu_categories
    FOR INSERT TO authenticated
    WITH CHECK (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "menu_categories_update" ON public.menu_categories
    FOR UPDATE TO authenticated
    USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "menu_categories_delete" ON public.menu_categories
    FOR DELETE TO authenticated
    USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
    );

-- 2. MENU_ITEMS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Users can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public can view menu items for enabled locations" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_select" ON public.menu_items;
DROP POLICY IF EXISTS "menu_items_all" ON public.menu_items;

-- Select policy: Employees at location OR Restaurant Owner OR Organization Owner OR Public (if enabled)
CREATE POLICY "menu_items_select" ON public.menu_items
    FOR SELECT TO anon, authenticated
    USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
        OR EXISTS (
            SELECT 1 FROM public.locations
            WHERE locations.id = menu_items.location_id
            AND locations.ordering_enabled = true
        )
    );

-- Manage policies (INSERT/UPDATE/DELETE): Owners, Managers, GMs, AGMs
CREATE POLICY "menu_items_insert" ON public.menu_items
    FOR INSERT TO authenticated
    WITH CHECK (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "menu_items_update" ON public.menu_items
    FOR UPDATE TO authenticated
    USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "menu_items_delete" ON public.menu_items
    FOR DELETE TO authenticated
    USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid()) OR l.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        )
    );
