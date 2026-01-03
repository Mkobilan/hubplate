-- Final fix for RLS recursion introduced in 20251231_security_performance_fixes.sql
-- This migration re-asserts the non-recursive policies using SECURITY DEFINER functions.

-- 1. Ensure the non-recursive helpers are up to date
CREATE OR REPLACE FUNCTION public.get_my_organizations()
RETURNS TABLE (org_id UUID) AS $$
BEGIN
    RETURN QUERY 
    SELECT id FROM public.organizations WHERE owner_id = (select auth.uid())
    UNION
    SELECT organization_id FROM public.employees WHERE user_id = (select auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_manager(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = target_org_id AND owner_id = (select auth.uid())
        )
        OR
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (select auth.uid()) 
            AND organization_id = target_org_id 
            AND role IN ('owner', 'manager', 'gm', 'agm')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix Organizations Policies
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "Organization select" ON public.organizations;
DROP POLICY IF EXISTS "Organization insert" ON public.organizations;
DROP POLICY IF EXISTS "Organization update" ON public.organizations;

CREATE POLICY "organizations_select" ON public.organizations
    FOR SELECT TO authenticated USING (
        owner_id = (select auth.uid())
        OR id IN (SELECT org_id FROM public.get_my_organizations())
    );

CREATE POLICY "organizations_insert" ON public.organizations
    FOR INSERT TO authenticated WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "organizations_update" ON public.organizations
    FOR UPDATE TO authenticated USING (owner_id = (select auth.uid()));

-- 3. Fix Employees Policies
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_update" ON public.employees;
DROP POLICY IF EXISTS "Employee select" ON public.employees;
DROP POLICY IF EXISTS "Employee insert" ON public.employees;
DROP POLICY IF EXISTS "Employee update" ON public.employees;
DROP POLICY IF EXISTS "Employee delete" ON public.employees;

CREATE POLICY "employees_select" ON public.employees
    FOR SELECT TO authenticated USING (
        user_id = (select auth.uid())
        OR organization_id IN (SELECT org_id FROM public.get_my_organizations())
    );

CREATE POLICY "employees_insert" ON public.employees
    FOR INSERT TO authenticated WITH CHECK (public.check_is_manager(organization_id));

CREATE POLICY "employees_update" ON public.employees
    FOR UPDATE TO authenticated USING (public.check_is_manager(organization_id) OR user_id = (select auth.uid()));

CREATE POLICY "employees_delete" ON public.employees
    FOR DELETE TO authenticated USING (public.check_is_manager(organization_id));

-- 4. Fix Locations Policies (avoiding direct employee/org recursion)
DROP POLICY IF EXISTS "locations_select" ON public.locations;
DROP POLICY IF EXISTS "locations_insert" ON public.locations;
DROP POLICY IF EXISTS "Location select" ON public.locations;
DROP POLICY IF EXISTS "Location insert" ON public.locations;

CREATE POLICY "locations_select" ON public.locations
    FOR SELECT TO authenticated USING (
        owner_id = (select auth.uid())
        OR organization_id IN (SELECT org_id FROM public.get_my_organizations())
    );

CREATE POLICY "locations_insert" ON public.locations
    FOR INSERT TO authenticated WITH CHECK (
        owner_id = (select auth.uid())
        OR organization_id IN (SELECT org_id FROM public.get_my_organizations())
    );
