-- ============================================================================
-- SUPABASE SECURITY AND PERFORMANCE FIXES
-- ============================================================================
-- Migration: 20251231_security_performance_fixes.sql
-- Date: 2025-12-31
-- 
-- This migration addresses:
-- 1. Function search_path security vulnerabilities
-- 2. RLS initplan performance optimizations
-- 3. Duplicate permissive policy consolidation
-- 4. Duplicate index removal
-- ============================================================================

-- ============================================================================
-- SECTION 1: FUNCTION SEARCH_PATH SECURITY FIXES
-- ============================================================================
-- Fix functions with mutable search_path by adding SET search_path = public

-- 1.1 Fix check_table_availability function
CREATE OR REPLACE FUNCTION public.check_table_availability(
    p_table_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER,
    p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_end_time TIME;
    v_conflict_count INTEGER;
BEGIN
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM public.reservations r
    JOIN public.reservation_tables rt ON rt.reservation_id = r.id
    WHERE rt.table_id = p_table_id
      AND r.reservation_date = p_date
      AND r.status NOT IN ('cancelled', 'no_show', 'completed')
      AND (p_exclude_reservation_id IS NULL OR r.id != p_exclude_reservation_id)
      AND (
          (r.reservation_time, r.reservation_time + (r.duration_minutes || ' minutes')::INTERVAL)
          OVERLAPS
          (p_start_time, v_end_time)
      );
    
    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- 1.2 Fix maintain_notification_limit function
CREATE OR REPLACE FUNCTION public.maintain_notification_limit()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE id IN (
    SELECT id FROM public.notifications
    WHERE recipient_id = NEW.recipient_id
    ORDER BY created_at DESC
    OFFSET 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- 1.3 Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- 1.4 Fix can_manage_seating function (already has SECURITY DEFINER, just add search_path)
CREATE OR REPLACE FUNCTION public.can_manage_seating(loc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- SECTION 2: DUPLICATE INDEX REMOVAL
-- ============================================================================
-- Remove duplicate indexes on shift_swap_requests table

DROP INDEX IF EXISTS public.idx_shift_swap_requests_requester;
DROP INDEX IF EXISTS public.idx_shift_swap_requests_shift;
DROP INDEX IF EXISTS public.idx_shift_swap_requests_target;

-- Keep these indexes (they are the properly named ones):
-- idx_shift_swap_requests_requester_id
-- idx_shift_swap_requests_shift_id
-- idx_shift_swap_requests_target_employee_id


-- ============================================================================
-- SECTION 3: RLS POLICY OPTIMIZATION AND CONSOLIDATION
-- ============================================================================
-- This section drops duplicate policies and recreates optimized versions
-- using (select auth.<function>()) pattern for better performance

-- -----------------------------------------------------------------------------
-- 3.1 KDS SCREENS - Optimize and keep separate policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "kds_screens_select_policy" ON public.kds_screens;
DROP POLICY IF EXISTS "kds_screens_insert_policy" ON public.kds_screens;
DROP POLICY IF EXISTS "kds_screens_update_policy" ON public.kds_screens;
DROP POLICY IF EXISTS "kds_screens_delete_policy" ON public.kds_screens;

CREATE POLICY "kds_screens_select_policy" ON public.kds_screens
    FOR SELECT TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "kds_screens_insert_policy" ON public.kds_screens
    FOR INSERT TO authenticated WITH CHECK (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "kds_screens_update_policy" ON public.kds_screens
    FOR UPDATE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "kds_screens_delete_policy" ON public.kds_screens
    FOR DELETE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.2 MENU ITEM KDS ASSIGNMENTS - Optimize policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "menu_item_kds_assignments_select_policy" ON public.menu_item_kds_assignments;
DROP POLICY IF EXISTS "menu_item_kds_assignments_insert_policy" ON public.menu_item_kds_assignments;
DROP POLICY IF EXISTS "menu_item_kds_assignments_delete_policy" ON public.menu_item_kds_assignments;

CREATE POLICY "menu_item_kds_assignments_select_policy" ON public.menu_item_kds_assignments
    FOR SELECT TO authenticated USING (
        menu_item_id IN (
            SELECT mi.id FROM public.menu_items mi WHERE mi.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "menu_item_kds_assignments_insert_policy" ON public.menu_item_kds_assignments
    FOR INSERT TO authenticated WITH CHECK (
        menu_item_id IN (
            SELECT mi.id FROM public.menu_items mi WHERE mi.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "menu_item_kds_assignments_delete_policy" ON public.menu_item_kds_assignments
    FOR DELETE TO authenticated USING (
        menu_item_id IN (
            SELECT mi.id FROM public.menu_items mi WHERE mi.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

-- -----------------------------------------------------------------------------
-- 3.3 ADD_ONS - Consolidate and optimize (remove duplicate SELECT policies)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "add_ons_select_policy" ON public.add_ons;
DROP POLICY IF EXISTS "add_ons_all_policy" ON public.add_ons;

-- Single SELECT policy for viewing
CREATE POLICY "add_ons_select_policy" ON public.add_ons
    FOR SELECT TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

-- Separate policies for write operations (managers/owners only)
CREATE POLICY "add_ons_insert_policy" ON public.add_ons
    FOR INSERT TO authenticated WITH CHECK (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "add_ons_update_policy" ON public.add_ons
    FOR UPDATE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "add_ons_delete_policy" ON public.add_ons
    FOR DELETE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.4 ADD_ON_CATEGORY_ASSIGNMENTS - Consolidate and optimize
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "add_on_assignments_select_policy" ON public.add_on_category_assignments;
DROP POLICY IF EXISTS "add_on_assignments_all_policy" ON public.add_on_category_assignments;

CREATE POLICY "add_on_category_assignments_select" ON public.add_on_category_assignments
    FOR SELECT TO authenticated USING (
        add_on_id IN (
            SELECT ao.id FROM public.add_ons ao WHERE ao.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "add_on_category_assignments_insert" ON public.add_on_category_assignments
    FOR INSERT TO authenticated WITH CHECK (
        add_on_id IN (
            SELECT ao.id FROM public.add_ons ao WHERE ao.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "add_on_category_assignments_update" ON public.add_on_category_assignments
    FOR UPDATE TO authenticated USING (
        add_on_id IN (
            SELECT ao.id FROM public.add_ons ao WHERE ao.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "add_on_category_assignments_delete" ON public.add_on_category_assignments
    FOR DELETE TO authenticated USING (
        add_on_id IN (
            SELECT ao.id FROM public.add_ons ao WHERE ao.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

-- -----------------------------------------------------------------------------
-- 3.5 UPSELLS - Consolidate and optimize
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "upsells_select_policy" ON public.upsells;
DROP POLICY IF EXISTS "upsells_all_policy" ON public.upsells;

CREATE POLICY "upsells_select_policy" ON public.upsells
    FOR SELECT TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "upsells_insert_policy" ON public.upsells
    FOR INSERT TO authenticated WITH CHECK (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "upsells_update_policy" ON public.upsells
    FOR UPDATE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "upsells_delete_policy" ON public.upsells
    FOR DELETE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.6 UPSELL_ASSIGNMENTS - Consolidate and optimize
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "upsell_assignments_select_policy" ON public.upsell_assignments;
DROP POLICY IF EXISTS "upsell_assignments_all_policy" ON public.upsell_assignments;

CREATE POLICY "upsell_assignments_select" ON public.upsell_assignments
    FOR SELECT TO authenticated USING (
        upsell_id IN (
            SELECT u.id FROM public.upsells u WHERE u.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "upsell_assignments_insert" ON public.upsell_assignments
    FOR INSERT TO authenticated WITH CHECK (
        upsell_id IN (
            SELECT u.id FROM public.upsells u WHERE u.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "upsell_assignments_update" ON public.upsell_assignments
    FOR UPDATE TO authenticated USING (
        upsell_id IN (
            SELECT u.id FROM public.upsells u WHERE u.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "upsell_assignments_delete" ON public.upsell_assignments
    FOR DELETE TO authenticated USING (
        upsell_id IN (
            SELECT u.id FROM public.upsells u WHERE u.location_id IN (
                SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

-- -----------------------------------------------------------------------------
-- 3.7 RESERVATION_SETTINGS - Consolidate and optimize
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Employees can view reservation settings" ON public.reservation_settings;
DROP POLICY IF EXISTS "Managers can manage reservation settings" ON public.reservation_settings;

CREATE POLICY "reservation_settings_select" ON public.reservation_settings
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservation_settings.location_id
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservation_settings.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservation_settings_insert" ON public.reservation_settings
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservation_settings.location_id
            AND e.role IN ('owner', 'manager', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservation_settings.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservation_settings_update" ON public.reservation_settings
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservation_settings.location_id
            AND e.role IN ('owner', 'manager', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservation_settings.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservation_settings_delete" ON public.reservation_settings
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservation_settings.location_id
            AND e.role IN ('owner', 'manager', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservation_settings.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.8 RESERVATIONS - Consolidate and optimize  
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Employees can view reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff can manage reservations" ON public.reservations;

CREATE POLICY "reservations_select" ON public.reservations
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservations.location_id
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservations.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservations_insert" ON public.reservations
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservations.location_id
            AND e.role IN ('owner', 'manager', 'host', 'server', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservations.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservations_update" ON public.reservations
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservations.location_id
            AND e.role IN ('owner', 'manager', 'host', 'server', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservations.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservations_delete" ON public.reservations
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.location_id = reservations.location_id
            AND e.role IN ('owner', 'manager', 'host', 'server', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations o
            JOIN public.locations l ON l.organization_id = o.id
            WHERE l.id = reservations.location_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.9 RESERVATION_TABLES - Consolidate and optimize
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Employees can view reservation tables" ON public.reservation_tables;
DROP POLICY IF EXISTS "Staff can manage reservation tables" ON public.reservation_tables;

CREATE POLICY "reservation_tables_select" ON public.reservation_tables
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.employees e ON e.location_id = r.location_id
            WHERE r.id = reservation_tables.reservation_id
            AND e.user_id = (SELECT auth.uid())
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.locations l ON l.id = r.location_id
            JOIN public.organizations o ON o.id = l.organization_id
            WHERE r.id = reservation_tables.reservation_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservation_tables_insert" ON public.reservation_tables
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.employees e ON e.location_id = r.location_id
            WHERE r.id = reservation_tables.reservation_id
            AND e.user_id = (SELECT auth.uid())
            AND e.role IN ('owner', 'manager', 'host', 'server', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.locations l ON l.id = r.location_id
            JOIN public.organizations o ON o.id = l.organization_id
            WHERE r.id = reservation_tables.reservation_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservation_tables_update" ON public.reservation_tables
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.employees e ON e.location_id = r.location_id
            WHERE r.id = reservation_tables.reservation_id
            AND e.user_id = (SELECT auth.uid())
            AND e.role IN ('owner', 'manager', 'host', 'server', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.locations l ON l.id = r.location_id
            JOIN public.organizations o ON o.id = l.organization_id
            WHERE r.id = reservation_tables.reservation_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "reservation_tables_delete" ON public.reservation_tables
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.employees e ON e.location_id = r.location_id
            WHERE r.id = reservation_tables.reservation_id
            AND e.user_id = (SELECT auth.uid())
            AND e.role IN ('owner', 'manager', 'host', 'server', 'gm', 'agm')
            AND e.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.reservations r
            JOIN public.locations l ON l.id = r.location_id
            JOIN public.organizations o ON o.id = l.organization_id
            WHERE r.id = reservation_tables.reservation_id
            AND o.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.10 SEATING_MAPS - Consolidate and optimize
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Seating maps management" ON public.seating_maps;
DROP POLICY IF EXISTS "Seating maps selection" ON public.seating_maps;
DROP POLICY IF EXISTS "Employees can view seating maps" ON public.seating_maps;
DROP POLICY IF EXISTS "Managers and Owners can manage seating maps" ON public.seating_maps;

CREATE POLICY "seating_maps_select" ON public.seating_maps
    FOR SELECT TO authenticated
    USING (
        can_manage_seating(location_id) OR
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) 
            AND e.location_id = seating_maps.location_id 
            AND e.is_active = TRUE
        )
    );

CREATE POLICY "seating_maps_insert" ON public.seating_maps
    FOR INSERT TO authenticated WITH CHECK (can_manage_seating(location_id));

CREATE POLICY "seating_maps_update" ON public.seating_maps
    FOR UPDATE TO authenticated USING (can_manage_seating(location_id));

CREATE POLICY "seating_maps_delete" ON public.seating_maps
    FOR DELETE TO authenticated USING (can_manage_seating(location_id));

-- -----------------------------------------------------------------------------
-- 3.11 SEATING_TABLES - Consolidate and optimize
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Seating tables management" ON public.seating_tables;
DROP POLICY IF EXISTS "Seating tables selection" ON public.seating_tables;
DROP POLICY IF EXISTS "Employees can view seating tables" ON public.seating_tables;
DROP POLICY IF EXISTS "Managers and Owners can manage seating tables" ON public.seating_tables;

CREATE POLICY "seating_tables_select" ON public.seating_tables
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.seating_maps sm
            WHERE sm.id = seating_tables.map_id
            AND (
                can_manage_seating(sm.location_id) OR
                EXISTS (
                    SELECT 1 FROM public.employees e
                    WHERE e.user_id = (SELECT auth.uid()) 
                    AND e.location_id = sm.location_id 
                    AND e.is_active = TRUE
                )
            )
        )
    );

CREATE POLICY "seating_tables_insert" ON public.seating_tables
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.seating_maps sm
            WHERE sm.id = seating_tables.map_id
            AND can_manage_seating(sm.location_id)
        )
    );

CREATE POLICY "seating_tables_update" ON public.seating_tables
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.seating_maps sm
            WHERE sm.id = seating_tables.map_id
            AND can_manage_seating(sm.location_id)
        )
    );

CREATE POLICY "seating_tables_delete" ON public.seating_tables
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.seating_maps sm
            WHERE sm.id = seating_tables.map_id
            AND can_manage_seating(sm.location_id)
        )
    );

-- -----------------------------------------------------------------------------
-- 3.12 SHIFT_SWAP_REQUESTS - Consolidate and optimize (has many duplicate policies)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "View shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Create shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Update shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Delete shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap select" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap insert" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap update" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap delete" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Managers can manage all shift swap requests" ON public.shift_swap_requests;

CREATE POLICY "shift_swap_requests_select" ON public.shift_swap_requests
    FOR SELECT TO authenticated USING (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR target_employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR organization_id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "shift_swap_requests_insert" ON public.shift_swap_requests
    FOR INSERT TO authenticated WITH CHECK (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "shift_swap_requests_update" ON public.shift_swap_requests
    FOR UPDATE TO authenticated USING (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR target_employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR organization_id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "shift_swap_requests_delete" ON public.shift_swap_requests
    FOR DELETE TO authenticated USING (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR (
            organization_id IN (SELECT org_id FROM get_my_organizations())
            AND EXISTS (SELECT 1 FROM public.employees WHERE user_id = (SELECT auth.uid()) AND role IN ('manager', 'owner', 'gm', 'agm'))
        )
    );

-- -----------------------------------------------------------------------------
-- 3.13 SHIFTS - Consolidate duplicate policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Shift select" ON public.shifts;
DROP POLICY IF EXISTS "Shift insert" ON public.shifts;
DROP POLICY IF EXISTS "Shift update" ON public.shifts;
DROP POLICY IF EXISTS "Shift delete" ON public.shifts;

-- Get existing shift policies to avoid conflicts and recreate optimized versions
DO $$
BEGIN
    -- Only create if they don't already exist with same names
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_select' AND tablename = 'shifts') THEN
        CREATE POLICY "shifts_select" ON public.shifts
            FOR SELECT TO authenticated USING (
                location_id IN (
                    SELECT e.location_id FROM public.employees e WHERE e.user_id = (SELECT auth.uid())
                    UNION
                    SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
                )
                OR organization_id IN (SELECT org_id FROM get_my_organizations())
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_insert' AND tablename = 'shifts') THEN
        CREATE POLICY "shifts_insert" ON public.shifts
            FOR INSERT TO authenticated WITH CHECK (
                location_id IN (
                    SELECT e.location_id FROM public.employees e 
                    WHERE e.user_id = (SELECT auth.uid()) 
                    AND e.role IN ('manager', 'owner', 'gm', 'agm')
                    UNION
                    SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
                )
                OR organization_id IN (SELECT org_id FROM get_my_organizations())
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_update' AND tablename = 'shifts') THEN
        CREATE POLICY "shifts_update" ON public.shifts
            FOR UPDATE TO authenticated USING (
                location_id IN (
                    SELECT e.location_id FROM public.employees e 
                    WHERE e.user_id = (SELECT auth.uid()) 
                    AND e.role IN ('manager', 'owner', 'gm', 'agm')
                    UNION
                    SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
                )
                OR organization_id IN (SELECT org_id FROM get_my_organizations())
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'shifts_delete' AND tablename = 'shifts') THEN
        CREATE POLICY "shifts_delete" ON public.shifts
            FOR DELETE TO authenticated USING (
                location_id IN (
                    SELECT e.location_id FROM public.employees e 
                    WHERE e.user_id = (SELECT auth.uid()) 
                    AND e.role IN ('manager', 'owner', 'gm', 'agm')
                    UNION
                    SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
                )
                OR organization_id IN (SELECT org_id FROM get_my_organizations())
            );
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3.14 EMPLOYEES - Fix initplan issues on existing policies
-- -----------------------------------------------------------------------------
-- Note: We need to be careful here as employee RLS can cause recursion issues
-- We'll optimize the policies that were flagged without breaking existing logic

DROP POLICY IF EXISTS "Employee select" ON public.employees;
DROP POLICY IF EXISTS "Employee update" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own server_color" ON public.employees;

-- Recreate with optimized auth calls
CREATE POLICY "employees_select" ON public.employees
    FOR SELECT TO authenticated USING (
        -- User can see employees at their location
        location_id IN (
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
        OR organization_id IN (
            SELECT o.id FROM public.organizations o WHERE o.owner_id = (SELECT auth.uid())
        )
        OR user_id = (SELECT auth.uid())
        OR location_id = (
            SELECT e.location_id FROM public.employees e 
            WHERE e.user_id = (SELECT auth.uid()) 
            AND e.is_active = true
            LIMIT 1
        )
    );

CREATE POLICY "employees_update" ON public.employees
    FOR UPDATE TO authenticated USING (
        -- User is the employee
        user_id = (SELECT auth.uid())
        -- Or user is location owner
        OR location_id IN (
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
        -- Or user is org owner
        OR organization_id IN (
            SELECT o.id FROM public.organizations o WHERE o.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.15 EMPLOYEE_INVITES - Consolidate duplicate policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Invite public view" ON public.employee_invites;
DROP POLICY IF EXISTS "Invite manage" ON public.employee_invites;
DROP POLICY IF EXISTS "Manage invites" ON public.employee_invites;

CREATE POLICY "employee_invites_select" ON public.employee_invites
    FOR SELECT USING (
        -- Anyone can view an invite (for accepting)
        TRUE
    );

CREATE POLICY "employee_invites_insert" ON public.employee_invites
    FOR INSERT TO authenticated WITH CHECK (
        location_id IN (
            SELECT e.location_id FROM public.employees e 
            WHERE e.user_id = (SELECT auth.uid()) 
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "employee_invites_update" ON public.employee_invites
    FOR UPDATE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e 
            WHERE e.user_id = (SELECT auth.uid()) 
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "employee_invites_delete" ON public.employee_invites
    FOR DELETE TO authenticated USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e 
            WHERE e.user_id = (SELECT auth.uid()) 
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 3.16 EMPLOYEE_ROLES - Consolidate duplicate policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Manage employee roles" ON public.employee_roles;
DROP POLICY IF EXISTS "View employee roles" ON public.employee_roles;

CREATE POLICY "employee_roles_select" ON public.employee_roles
    FOR SELECT TO authenticated USING (
        employee_id IN (
            SELECT e.id FROM public.employees e
            WHERE e.location_id IN (
                SELECT emp.location_id FROM public.employees emp WHERE emp.user_id = (SELECT auth.uid())
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "employee_roles_insert" ON public.employee_roles
    FOR INSERT TO authenticated WITH CHECK (
        employee_id IN (
            SELECT e.id FROM public.employees e
            WHERE e.location_id IN (
                SELECT emp.location_id FROM public.employees emp 
                WHERE emp.user_id = (SELECT auth.uid()) 
                AND emp.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "employee_roles_update" ON public.employee_roles
    FOR UPDATE TO authenticated USING (
        employee_id IN (
            SELECT e.id FROM public.employees e
            WHERE e.location_id IN (
                SELECT emp.location_id FROM public.employees emp 
                WHERE emp.user_id = (SELECT auth.uid()) 
                AND emp.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY "employee_roles_delete" ON public.employee_roles
    FOR DELETE TO authenticated USING (
        employee_id IN (
            SELECT e.id FROM public.employees e
            WHERE e.location_id IN (
                SELECT emp.location_id FROM public.employees emp 
                WHERE emp.user_id = (SELECT auth.uid()) 
                AND emp.role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT l.id FROM public.locations l WHERE l.owner_id = (SELECT auth.uid())
            )
        )
    );

-- -----------------------------------------------------------------------------
-- 3.17 ORGANIZATIONS - Optimize initplan calls
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Organization insert" ON public.organizations;
DROP POLICY IF EXISTS "Organization update" ON public.organizations;
DROP POLICY IF EXISTS "Organization select" ON public.organizations;

CREATE POLICY "organizations_select" ON public.organizations
    FOR SELECT TO authenticated USING (
        owner_id = (SELECT auth.uid())
        OR id IN (
            SELECT e.organization_id FROM public.employees e 
            WHERE e.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "organizations_insert" ON public.organizations
    FOR INSERT TO authenticated WITH CHECK (
        owner_id = (SELECT auth.uid())
    );

CREATE POLICY "organizations_update" ON public.organizations
    FOR UPDATE TO authenticated USING (
        owner_id = (SELECT auth.uid())
    );

-- -----------------------------------------------------------------------------
-- 3.18 LOCATIONS - Optimize initplan calls
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Location insert" ON public.locations;

CREATE POLICY "locations_insert" ON public.locations
    FOR INSERT TO authenticated WITH CHECK (
        owner_id = (SELECT auth.uid())
        OR organization_id IN (
            SELECT o.id FROM public.organizations o WHERE o.owner_id = (SELECT auth.uid())
        )
    );


-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this in Supabase SQL Editor to verify function search_path is set:
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE proname IN ('check_table_availability', 'maintain_notification_limit', 'handle_updated_at', 'can_manage_seating');
