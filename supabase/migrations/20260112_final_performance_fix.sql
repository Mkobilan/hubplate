-- FINAL PERFORMANCE REMEDIATION (Idempotent)
-- Resolves all RLS conflicts, "Auth RLS Init Plan", and "Multiple Permissive Policies"
-- Includes Shift Swap RLS Fixes

-- ============================================
-- 1. SIDES & DRESSINGS
-- ============================================

-- Sides
DROP POLICY IF EXISTS "sides_select_policy" ON public.sides;
DROP POLICY IF EXISTS "sides_all_policy" ON public.sides;
DROP POLICY IF EXISTS "sides_modification_policy" ON public.sides;
DROP POLICY IF EXISTS "sides_update_delete_policy" ON public.sides;
DROP POLICY IF EXISTS "sides_delete_policy" ON public.sides;

CREATE POLICY "sides_select_policy" ON public.sides
    FOR SELECT USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );

CREATE POLICY "sides_modification_policy" ON public.sides
    FOR INSERT WITH CHECK (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) AND role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );

CREATE POLICY "sides_update_delete_policy" ON public.sides
    FOR UPDATE USING (
         location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) AND role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );

CREATE POLICY "sides_delete_policy" ON public.sides
    FOR DELETE USING (
         location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) AND role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );

-- Dressings
DROP POLICY IF EXISTS "dressings_select_policy" ON public.dressings;
DROP POLICY IF EXISTS "dressings_all_policy" ON public.dressings;
DROP POLICY IF EXISTS "dressings_modification_policy" ON public.dressings;
DROP POLICY IF EXISTS "dressings_insert_policy" ON public.dressings;
DROP POLICY IF EXISTS "dressings_update_policy" ON public.dressings;
DROP POLICY IF EXISTS "dressings_delete_policy" ON public.dressings;

CREATE POLICY "dressings_select_policy" ON public.dressings
    FOR SELECT USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );

CREATE POLICY "dressings_insert_policy" ON public.dressings
    FOR INSERT WITH CHECK (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
            AND role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );

CREATE POLICY "dressings_update_policy" ON public.dressings
    FOR UPDATE USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
            AND role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );

CREATE POLICY "dressings_delete_policy" ON public.dressings
    FOR DELETE USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
            AND role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    );


-- Side Assignments
DROP POLICY IF EXISTS "side_assignments_select_policy" ON public.side_assignments;
DROP POLICY IF EXISTS "side_assignments_all_policy" ON public.side_assignments;
DROP POLICY IF EXISTS "side_assignments_access_policy" ON public.side_assignments;
DROP POLICY IF EXISTS "side_assignments_modify_policy" ON public.side_assignments;
DROP POLICY IF EXISTS "side_assignments_update_delete_policy" ON public.side_assignments;

CREATE POLICY "side_assignments_select_policy" ON public.side_assignments
    FOR SELECT USING (
        side_id IN (SELECT id FROM public.sides)
    );

CREATE POLICY "side_assignments_modify_policy" ON public.side_assignments
    FOR INSERT WITH CHECK (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "side_assignments_update_delete_policy" ON public.side_assignments
    FOR DELETE USING (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

-- Dressing Assignments
DROP POLICY IF EXISTS "dressing_assignments_select_policy" ON public.dressing_assignments;
DROP POLICY IF EXISTS "dressing_assignments_all_policy" ON public.dressing_assignments;
DROP POLICY IF EXISTS "dressing_assignments_access_policy" ON public.dressing_assignments;
DROP POLICY IF EXISTS "dressing_assignments_modify_policy" ON public.dressing_assignments;
DROP POLICY IF EXISTS "dressing_assignments_delete_policy" ON public.dressing_assignments;

CREATE POLICY "dressing_assignments_select_policy" ON public.dressing_assignments
    FOR SELECT USING (
        dressing_id IN (SELECT id FROM public.dressings)
    );

CREATE POLICY "dressing_assignments_modify_policy" ON public.dressing_assignments
    FOR INSERT WITH CHECK (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

CREATE POLICY "dressing_assignments_delete_policy" ON public.dressing_assignments
    FOR DELETE USING (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

-- ============================================
-- 2. KDS ASSIGNMENTS
-- ============================================

-- Side KDS Assignments
DROP POLICY IF EXISTS "side_kds_assignments_select_policy" ON public.side_kds_assignments;
DROP POLICY IF EXISTS "side_kds_assignments_insert_policy" ON public.side_kds_assignments;
DROP POLICY IF EXISTS "side_kds_assignments_delete_policy" ON public.side_kds_assignments;

CREATE POLICY "side_kds_assignments_select_policy" ON public.side_kds_assignments
    FOR SELECT TO authenticated USING (
        side_id IN (SELECT id FROM public.sides WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        ))
    );

CREATE POLICY "side_kds_assignments_insert_policy" ON public.side_kds_assignments
    FOR INSERT TO authenticated WITH CHECK (
         side_id IN (SELECT id FROM public.sides WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        ))
    );

CREATE POLICY "side_kds_assignments_delete_policy" ON public.side_kds_assignments
    FOR DELETE TO authenticated USING (
         side_id IN (SELECT id FROM public.sides WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        ))
    );

-- Dressing KDS Assignments
DROP POLICY IF EXISTS "dressing_kds_assignments_select_policy" ON public.dressing_kds_assignments;
DROP POLICY IF EXISTS "dressing_kds_assignments_insert_policy" ON public.dressing_kds_assignments;
DROP POLICY IF EXISTS "dressing_kds_assignments_delete_policy" ON public.dressing_kds_assignments;

CREATE POLICY "dressing_kds_assignments_select_policy" ON public.dressing_kds_assignments
    FOR SELECT TO authenticated USING (
        dressing_id IN (SELECT id FROM public.dressings WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        ))
    );

CREATE POLICY "dressing_kds_assignments_insert_policy" ON public.dressing_kds_assignments
    FOR INSERT TO authenticated WITH CHECK (
         dressing_id IN (SELECT id FROM public.dressings WHERE location_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        ))
        ));

CREATE POLICY "dressing_kds_assignments_delete_policy" ON public.dressing_kds_assignments
    FOR DELETE TO authenticated USING (
         dressing_id IN (SELECT id FROM public.dressings WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        ))
    );


-- ============================================
-- 3. PRICING RULES
-- ============================================

DROP POLICY IF EXISTS "Users can view pricing rules" ON public.pricing_rules; 
DROP POLICY IF EXISTS "Public can view pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Managers can manage pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Owners can manage pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Consolidated access for pricing_rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_select" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_manage" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_insert" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_update" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_delete" ON public.pricing_rules;

CREATE POLICY "pricing_rules_select" ON public.pricing_rules
    FOR SELECT USING (true);

CREATE POLICY "pricing_rules_insert" ON public.pricing_rules
    FOR INSERT WITH CHECK (
        location_id IN (
            SELECT e.location_id FROM public.employees e 
            WHERE e.user_id = (select auth.uid()) 
            AND e.role IN ('owner', 'manager', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l 
            JOIN public.organizations o ON l.organization_id = o.id 
            WHERE o.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "pricing_rules_update" ON public.pricing_rules
    FOR UPDATE USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e 
            WHERE e.user_id = (select auth.uid()) 
            AND e.role IN ('owner', 'manager', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l 
            JOIN public.organizations o ON l.organization_id = o.id 
            WHERE o.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "pricing_rules_delete" ON public.pricing_rules
    FOR DELETE USING (
        location_id IN (
            SELECT e.location_id FROM public.employees e 
            WHERE e.user_id = (select auth.uid()) 
            AND e.role IN ('owner', 'manager', 'gm', 'agm')
            UNION
            SELECT l.id FROM public.locations l 
            JOIN public.organizations o ON l.organization_id = o.id 
            WHERE o.owner_id = (select auth.uid())
        )
    );


-- ============================================
-- 4. INVENTORY STORAGE AREAS
-- ============================================

DROP POLICY IF EXISTS "Allow authenticated users to read inventory_storage_areas" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "Allow managers to insert inventory_storage_areas" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "Allow managers to update inventory_storage_areas" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "Allow managers to delete inventory_storage_areas" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "inventory_storage_areas_select" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "inventory_storage_areas_manage" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "inventory_storage_areas_insert" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "inventory_storage_areas_update" ON public.inventory_storage_areas;
DROP POLICY IF EXISTS "inventory_storage_areas_delete" ON public.inventory_storage_areas;

CREATE POLICY "inventory_storage_areas_select" ON public.inventory_storage_areas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "inventory_storage_areas_insert" ON public.inventory_storage_areas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (select auth.uid())
            AND e.location_id = inventory_storage_areas.location_id
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
        )
        OR EXISTS (
             SELECT 1 FROM public.locations l
             WHERE l.id = inventory_storage_areas.location_id
             AND l.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "inventory_storage_areas_update" ON public.inventory_storage_areas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (select auth.uid())
            AND e.location_id = inventory_storage_areas.location_id
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
        )
        OR EXISTS (
             SELECT 1 FROM public.locations l
             WHERE l.id = inventory_storage_areas.location_id
             AND l.owner_id = (select auth.uid())
        )
    );

CREATE POLICY "inventory_storage_areas_delete" ON public.inventory_storage_areas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (select auth.uid())
            AND e.location_id = inventory_storage_areas.location_id
            AND e.role IN ('manager', 'owner', 'gm', 'agm')
        )
        OR EXISTS (
             SELECT 1 FROM public.locations l
             WHERE l.id = inventory_storage_areas.location_id
             AND l.owner_id = (select auth.uid())
        )
    );


-- ============================================
-- 5. CUSTOMERS & NOTIFICATIONS
-- ============================================

-- Customers
DROP POLICY IF EXISTS "Customer staff access" ON public.customers;
DROP POLICY IF EXISTS "Public can create customer profile" ON public.customers;
DROP POLICY IF EXISTS "Users can update their own customer profile" ON public.customers;
DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;

CREATE POLICY "Public can create customer profile" ON public.customers
    FOR INSERT
    WITH CHECK ((select auth.role()) IN ('anon', 'authenticated'));

CREATE POLICY "Users can update their own customer profile" ON public.customers
    FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Staff can view customers" ON public.customers
    FOR SELECT TO authenticated
    USING (
         location_id IN (SELECT id FROM public.locations WHERE owner_id = (select auth.uid())) OR
         location_id IN (SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()))
    );

-- Notifications
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Recipients can update notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Recipients can update notifications" ON public.notifications
    FOR UPDATE
    USING (
        recipient_id IN (
            SELECT id FROM public.employees WHERE user_id = (select auth.uid())
        )
    );

-- ============================================
-- 6. SHIFT SWAP REQUESTS
-- ============================================

DROP POLICY IF EXISTS "View shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Create shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Update shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Delete shift swap requests" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap select" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap insert" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap update" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "Shift swap delete" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "shift_swap_requests_select" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "shift_swap_requests_insert" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "shift_swap_requests_update" ON public.shift_swap_requests;
DROP POLICY IF EXISTS "shift_swap_requests_delete" ON public.shift_swap_requests;

CREATE POLICY "shift_swap_requests_select" ON public.shift_swap_requests
    FOR SELECT TO authenticated USING (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()) UNION SELECT NULL WHERE false)
        OR
        target_employee_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()) UNION SELECT NULL WHERE false)
        OR
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "shift_swap_requests_insert" ON public.shift_swap_requests
    FOR INSERT TO authenticated WITH CHECK (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()) UNION SELECT NULL WHERE false)
        OR
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "shift_swap_requests_update" ON public.shift_swap_requests
    FOR UPDATE TO authenticated USING (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()) UNION SELECT NULL WHERE false)
        OR
        target_employee_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()) UNION SELECT NULL WHERE false)
        OR
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "shift_swap_requests_delete" ON public.shift_swap_requests
    FOR DELETE TO authenticated USING (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()) UNION SELECT NULL WHERE false)
        OR
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );
