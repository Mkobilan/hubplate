-- FINAL PERFORMANCE REMEDIATION SCRIPT
-- Resolves "Multiple Permissive Policies" and "auth_rls_initplan" warnings.
-- Strategy: Action-specific policies with explicit role targeting (TO authenticated/anon).

-- -----------------------------------------------------------------------------
-- CLEANUP: DROP ALL LEGACY POLICIES
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
    -- Organizations
    DROP POLICY IF EXISTS "View organization" ON public.organizations;
    DROP POLICY IF EXISTS "Manage organization" ON public.organizations;
    DROP POLICY IF EXISTS "Organization select" ON public.organizations;
    DROP POLICY IF EXISTS "Organization update" ON public.organizations;

    -- Locations
    DROP POLICY IF EXISTS "View locations" ON public.locations;
    DROP POLICY IF EXISTS "Modify locations" ON public.locations;
    DROP POLICY IF EXISTS "Manage locations" ON public.locations;
    DROP POLICY IF EXISTS "Location select" ON public.locations;
    DROP POLICY IF EXISTS "Location insert" ON public.locations;
    DROP POLICY IF EXISTS "Location update" ON public.locations;
    DROP POLICY IF EXISTS "Location delete" ON public.locations;

    -- Employees
    DROP POLICY IF EXISTS "View employees" ON public.employees;
    DROP POLICY IF EXISTS "Join organization" ON public.employees;
    DROP POLICY IF EXISTS "Manage employees" ON public.employees;
    DROP POLICY IF EXISTS "Self employee access" ON public.employees;
    DROP POLICY IF EXISTS "Organization employee view" ON public.employees;
    DROP POLICY IF EXISTS "Employees can update own info" ON public.employees;
    DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
    DROP POLICY IF EXISTS "Employee select" ON public.employees;
    DROP POLICY IF EXISTS "Employee insert" ON public.employees;
    DROP POLICY IF EXISTS "Employee update" ON public.employees;
    DROP POLICY IF EXISTS "Employee delete" ON public.employees;

    -- Availability
    DROP POLICY IF EXISTS "Availability access" ON public.availability;
    DROP POLICY IF EXISTS "Manage availability" ON public.availability;
    DROP POLICY IF EXISTS "Self availability access" ON public.availability;
    DROP POLICY IF EXISTS "Availability select" ON public.availability;
    DROP POLICY IF EXISTS "Availability insert" ON public.availability;
    DROP POLICY IF EXISTS "Availability update" ON public.availability;
    DROP POLICY IF EXISTS "Availability delete" ON public.availability;

    -- Shifts
    DROP POLICY IF EXISTS "View own shifts" ON public.shifts;
    DROP POLICY IF EXISTS "Manage shifts" ON public.shifts;
    DROP POLICY IF EXISTS "View shifts" ON public.shifts;
    DROP POLICY IF EXISTS "View organization shifts" ON public.shifts;
    DROP POLICY IF EXISTS "Shift select" ON public.shifts;
    DROP POLICY IF EXISTS "Shift insert" ON public.shifts;
    DROP POLICY IF EXISTS "Shift update" ON public.shifts;
    DROP POLICY IF EXISTS "Shift delete" ON public.shifts;

    -- Time Entries
    DROP POLICY IF EXISTS "Time entry access" ON public.time_entries;
    DROP POLICY IF EXISTS "Manage time entries" ON public.time_entries;
    DROP POLICY IF EXISTS "Self time entries access" ON public.time_entries;
    DROP POLICY IF EXISTS "Update own time entries" ON public.time_entries;
    DROP POLICY IF EXISTS "Time entry select" ON public.time_entries;
    DROP POLICY IF EXISTS "Time entry insert" ON public.time_entries;
    DROP POLICY IF EXISTS "Time entry update" ON public.time_entries;
    DROP POLICY IF EXISTS "Time entry delete" ON public.time_entries;

    -- Employee Invites
    DROP POLICY IF EXISTS "Manage invites" ON public.employee_invites;
    DROP POLICY IF EXISTS "View invite public" ON public.employee_invites;
    DROP POLICY IF EXISTS "Invite manage" ON public.employee_invites;
    DROP POLICY IF EXISTS "Invite public view" ON public.employee_invites;

    -- Customers
    DROP POLICY IF EXISTS "Customers location access" ON public.customers;
    DROP POLICY IF EXISTS "Customer staff access" ON public.customers;
    DROP POLICY IF EXISTS "Customer public select" ON public.customers;
    DROP POLICY IF EXISTS "Customer public insert" ON public.customers;
    DROP POLICY IF EXISTS "Customer public update" ON public.customers;
    DROP POLICY IF EXISTS "Allow public select for enrollment" ON public.customers;
    DROP POLICY IF EXISTS "Allow public insert for enrollment" ON public.customers;
    DROP POLICY IF EXISTS "Allow public update for enrollment" ON public.customers;
    DROP POLICY IF EXISTS "Location access for customers" ON public.customers;

    -- Loyalty & Feedback
    DROP POLICY IF EXISTS "Loyalty programs access" ON public.loyalty_programs;
    DROP POLICY IF EXISTS "Loyalty tiers access" ON public.loyalty_tiers;
    DROP POLICY IF EXISTS "Loyalty rewards access" ON public.loyalty_rewards;
    DROP POLICY IF EXISTS "Customer feedback access" ON public.customer_feedback;
    DROP POLICY IF EXISTS "Location access for customer_feedback" ON public.customer_feedback;
END $$;

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS
-- -----------------------------------------------------------------------------
CREATE POLICY "Organization select" ON public.organizations
    FOR SELECT TO authenticated USING (
        id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "Organization update" ON public.organizations
    FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. LOCATIONS
-- -----------------------------------------------------------------------------
CREATE POLICY "Location select" ON public.locations
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "Location insert" ON public.locations
    FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())));

CREATE POLICY "Location update" ON public.locations
    FOR UPDATE TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())));

CREATE POLICY "Location delete" ON public.locations
    FOR DELETE TO authenticated USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())));

-- -----------------------------------------------------------------------------
-- 3. EMPLOYEES
-- -----------------------------------------------------------------------------
CREATE POLICY "Employee select" ON public.employees
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT org_id FROM get_my_organizations())
        OR user_id = (SELECT auth.uid())
    );

CREATE POLICY "Employee insert" ON public.employees
    FOR INSERT TO authenticated WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR user_id = (SELECT auth.uid())
    );

CREATE POLICY "Employee update" ON public.employees
    FOR UPDATE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR user_id = (SELECT auth.uid())
    );

CREATE POLICY "Employee delete" ON public.employees
    FOR DELETE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
    );

-- -----------------------------------------------------------------------------
-- 4. AVAILABILITY
-- -----------------------------------------------------------------------------
CREATE POLICY "Availability select" ON public.availability
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Availability insert" ON public.availability
    FOR INSERT TO authenticated WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Availability update" ON public.availability
    FOR UPDATE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Availability delete" ON public.availability
    FOR DELETE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

-- -----------------------------------------------------------------------------
-- 5. SHIFTS
-- -----------------------------------------------------------------------------
CREATE POLICY "Shift select" ON public.shifts
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "Shift insert" ON public.shifts
    FOR INSERT TO authenticated WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Shift update" ON public.shifts
    FOR UPDATE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Shift delete" ON public.shifts
    FOR DELETE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

-- -----------------------------------------------------------------------------
-- 6. TIME ENTRIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Time entry select" ON public.time_entries
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Time entry insert" ON public.time_entries
    FOR INSERT TO authenticated WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Time entry update" ON public.time_entries
    FOR UPDATE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Time entry delete" ON public.time_entries
    FOR DELETE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

-- -----------------------------------------------------------------------------
-- 7. EMPLOYEE INVITES
-- -----------------------------------------------------------------------------
CREATE POLICY "Invite manage" ON public.employee_invites
    FOR ALL TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid()))
    );

CREATE POLICY "Invite public view" ON public.employee_invites
    FOR SELECT TO anon USING (status = 'pending' AND expires_at > NOW());

-- -----------------------------------------------------------------------------
-- 8. CUSTOMERS
-- -----------------------------------------------------------------------------
CREATE POLICY "Customer staff access" ON public.customers
    FOR ALL TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Customer public select" ON public.customers
    FOR SELECT TO anon USING (true);

CREATE POLICY "Customer public insert" ON public.customers
    FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Customer public update" ON public.customers
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 9. LOYALTY & FEEDBACK
-- -----------------------------------------------------------------------------
CREATE POLICY "Loyalty programs access" ON public.loyalty_programs
    FOR ALL TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Loyalty tiers access" ON public.loyalty_tiers
    FOR ALL TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Loyalty rewards access" ON public.loyalty_rewards
    FOR ALL TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Customer feedback access" ON public.customer_feedback
    FOR ALL TO authenticated USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );
