-- FINAL RLS POLICY REMEDIATION SCRIPT
-- Resolves "RLS Enabled No Policy" suggestions for functional tables.

-- -----------------------------------------------------------------------------
-- CLEANUP: DROP ANY TEMPORARY OR CONFLICTING POLICIES
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Happy hour select" ON public.happy_hour_rules;
    DROP POLICY IF EXISTS "Happy hour insert" ON public.happy_hour_rules;
    DROP POLICY IF EXISTS "Happy hour update" ON public.happy_hour_rules;
    DROP POLICY IF EXISTS "Happy hour delete" ON public.happy_hour_rules;
    DROP POLICY IF EXISTS "Happy hour manage" ON public.happy_hour_rules;
    
    DROP POLICY IF EXISTS "Kitchen ticket select" ON public.kitchen_tickets;
    DROP POLICY IF EXISTS "Kitchen ticket insert" ON public.kitchen_tickets;
    DROP POLICY IF EXISTS "Kitchen ticket update" ON public.kitchen_tickets;
    DROP POLICY IF EXISTS "Kitchen ticket delete" ON public.kitchen_tickets;
    DROP POLICY IF EXISTS "Kitchen ticket manage" ON public.kitchen_tickets;
    
    DROP POLICY IF EXISTS "Inventory transaction select" ON public.inventory_transactions;
    DROP POLICY IF EXISTS "Inventory transaction insert" ON public.inventory_transactions;
    DROP POLICY IF EXISTS "Inventory transaction update" ON public.inventory_transactions;
    DROP POLICY IF EXISTS "Inventory transaction delete" ON public.inventory_transactions;
    DROP POLICY IF EXISTS "Inventory transaction manage" ON public.inventory_transactions;
    
    DROP POLICY IF EXISTS "Waste log select" ON public.waste_logs;
    DROP POLICY IF EXISTS "Waste log insert" ON public.waste_logs;
    DROP POLICY IF EXISTS "Waste log update" ON public.waste_logs;
    DROP POLICY IF EXISTS "Waste log delete" ON public.waste_logs;
    DROP POLICY IF EXISTS "Waste log manage" ON public.waste_logs;
    
    DROP POLICY IF EXISTS "Ingredient link select" ON public.ingredient_links;
    DROP POLICY IF EXISTS "Ingredient link insert" ON public.ingredient_links;
    DROP POLICY IF EXISTS "Ingredient link update" ON public.ingredient_links;
    DROP POLICY IF EXISTS "Ingredient link delete" ON public.ingredient_links;
    DROP POLICY IF EXISTS "Ingredient link manage" ON public.ingredient_links;
    
    DROP POLICY IF EXISTS "Shift swap select" ON public.shift_swap_requests;
    DROP POLICY IF EXISTS "Shift swap insert" ON public.shift_swap_requests;
    DROP POLICY IF EXISTS "Shift swap update" ON public.shift_swap_requests;
    DROP POLICY IF EXISTS "Shift swap delete" ON public.shift_swap_requests;
END $$;

-- -----------------------------------------------------------------------------
-- 1. HAPPY HOUR RULES
-- -----------------------------------------------------------------------------
CREATE POLICY "Happy hour select" ON public.happy_hour_rules
    FOR SELECT TO authenticated USING (true); -- Publicly viewable by staff

CREATE POLICY "Happy hour insert" ON public.happy_hour_rules
    FOR INSERT TO authenticated WITH CHECK (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND location_id = public.happy_hour_rules.location_id
        )
    );

CREATE POLICY "Happy hour update" ON public.happy_hour_rules
    FOR UPDATE TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND location_id = public.happy_hour_rules.location_id
        )
    );

CREATE POLICY "Happy hour delete" ON public.happy_hour_rules
    FOR DELETE TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND location_id = public.happy_hour_rules.location_id
        )
    );

-- -----------------------------------------------------------------------------
-- 2. KITCHEN TICKETS
-- -----------------------------------------------------------------------------
CREATE POLICY "Kitchen ticket select" ON public.kitchen_tickets
    FOR SELECT TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Kitchen ticket insert" ON public.kitchen_tickets
    FOR INSERT TO authenticated WITH CHECK (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner', 'cook') 
            AND location_id = public.kitchen_tickets.location_id
        )
    );

CREATE POLICY "Kitchen ticket update" ON public.kitchen_tickets
    FOR UPDATE TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner', 'cook') 
            AND location_id = public.kitchen_tickets.location_id
        )
    );

CREATE POLICY "Kitchen ticket delete" ON public.kitchen_tickets
    FOR DELETE TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner', 'cook') 
            AND location_id = public.kitchen_tickets.location_id
        )
    );

-- -----------------------------------------------------------------------------
-- 3. INVENTORY TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE POLICY "Inventory transaction select" ON public.inventory_transactions
    FOR SELECT TO authenticated USING (
        inventory_item_id IN (
            SELECT id FROM public.inventory_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "Inventory transaction insert" ON public.inventory_transactions
    FOR INSERT TO authenticated WITH CHECK (
        inventory_item_id IN (
            SELECT id FROM public.inventory_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  EXISTS (
                      SELECT 1 FROM public.employees 
                      WHERE user_id = (SELECT auth.uid()) 
                      AND role IN ('manager', 'owner') 
                      AND location_id = public.inventory_items.location_id
                  )
        )
    );

CREATE POLICY "Inventory transaction update" ON public.inventory_transactions
    FOR UPDATE TO authenticated USING (
        inventory_item_id IN (
            SELECT id FROM public.inventory_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  EXISTS (
                      SELECT 1 FROM public.employees 
                      WHERE user_id = (SELECT auth.uid()) 
                      AND role IN ('manager', 'owner') 
                      AND location_id = public.inventory_items.location_id
                  )
        )
    );

CREATE POLICY "Inventory transaction delete" ON public.inventory_transactions
    FOR DELETE TO authenticated USING (
        inventory_item_id IN (
            SELECT id FROM public.inventory_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  EXISTS (
                      SELECT 1 FROM public.employees 
                      WHERE user_id = (SELECT auth.uid()) 
                      AND role IN ('manager', 'owner') 
                      AND location_id = public.inventory_items.location_id
                  )
        )
    );

-- -----------------------------------------------------------------------------
-- 4. WASTE LOGS
-- -----------------------------------------------------------------------------
CREATE POLICY "Waste log select" ON public.waste_logs
    FOR SELECT TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Waste log insert" ON public.waste_logs
    FOR INSERT TO authenticated WITH CHECK (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND location_id = public.waste_logs.location_id
        )
    );

CREATE POLICY "Waste log update" ON public.waste_logs
    FOR UPDATE TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND location_id = public.waste_logs.location_id
        )
    );

CREATE POLICY "Waste log delete" ON public.waste_logs
    FOR DELETE TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND location_id = public.waste_logs.location_id
        )
    );

-- -----------------------------------------------------------------------------
-- 5. INGREDIENT LINKS
-- -----------------------------------------------------------------------------
CREATE POLICY "Ingredient link select" ON public.ingredient_links
    FOR SELECT TO authenticated USING (
        menu_item_id IN (
            SELECT id FROM public.menu_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "Ingredient link insert" ON public.ingredient_links
    FOR INSERT TO authenticated WITH CHECK (
        menu_item_id IN (
            SELECT id FROM public.menu_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  EXISTS (
                      SELECT 1 FROM public.employees 
                      WHERE user_id = (SELECT auth.uid()) 
                      AND role IN ('manager', 'owner') 
                      AND location_id = public.menu_items.location_id
                  )
        )
    );

CREATE POLICY "Ingredient link update" ON public.ingredient_links
    FOR UPDATE TO authenticated USING (
        menu_item_id IN (
            SELECT id FROM public.menu_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  EXISTS (
                      SELECT 1 FROM public.employees 
                      WHERE user_id = (SELECT auth.uid()) 
                      AND role IN ('manager', 'owner') 
                      AND location_id = public.menu_items.location_id
                  )
        )
    );

CREATE POLICY "Ingredient link delete" ON public.ingredient_links
    FOR DELETE TO authenticated USING (
        menu_item_id IN (
            SELECT id FROM public.menu_items 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  EXISTS (
                      SELECT 1 FROM public.employees 
                      WHERE user_id = (SELECT auth.uid()) 
                      AND role IN ('manager', 'owner') 
                      AND location_id = public.menu_items.location_id
                  )
        )
    );

-- -----------------------------------------------------------------------------
-- 6. SHIFT SWAP REQUESTS
-- -----------------------------------------------------------------------------
CREATE POLICY "Shift swap select" ON public.shift_swap_requests
    FOR SELECT TO authenticated USING (
        shift_id IN (
            SELECT id FROM public.shifts 
            WHERE location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
                  location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        )
    );

CREATE POLICY "Shift swap insert" ON public.shift_swap_requests
    FOR INSERT TO authenticated WITH CHECK (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Shift swap update" ON public.shift_swap_requests
    FOR UPDATE TO authenticated USING (
        requester_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid())) OR
        target_employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid())) OR
        EXISTS (
            SELECT 1 FROM public.employees e
            JOIN public.shifts s ON s.location_id = e.location_id
            WHERE e.user_id = (SELECT auth.uid()) 
            AND e.role IN ('manager', 'owner') 
            AND s.id = public.shift_swap_requests.shift_id
        )
    );

CREATE POLICY "Shift swap delete" ON public.shift_swap_requests
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            JOIN public.shifts s ON s.location_id = e.location_id
            WHERE e.user_id = (SELECT auth.uid()) 
            AND e.role IN ('manager', 'owner') 
            AND s.id = public.shift_swap_requests.shift_id
        )
    );
