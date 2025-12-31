-- Fix for infinite recursion in employees policies
-- This occurs when a policy (e.g., SELECT) queries the same table, 
-- triggering the policy again, and so on.

-- 1. Redefine get_my_organizations to be even more robust and non-recursive
-- By using SECURITY DEFINER and LANGUAGE plpgsql, we ensure the query inside 
-- runs as the owner (postgres) and is not inlined into the policy.
CREATE OR REPLACE FUNCTION public.get_my_organizations()
RETURNS TABLE (org_id UUID) AS $$
BEGIN
    RETURN QUERY 
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    UNION
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Redefine check_is_manager to be non-recursive as well
CREATE OR REPLACE FUNCTION public.check_is_manager(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        -- Is the Organization Owner?
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = target_org_id AND owner_id = auth.uid()
        )
        OR
        -- Is an employee with manager/owner/gm/agm role?
        -- This query runs as the function owner, bypassing RLS on employees
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() 
            AND organization_id = target_org_id 
            AND role IN ('owner', 'manager', 'gm', 'agm')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Update Employees Policies
-- We drop and recreate them to ensure they use the newly defined functions
DROP POLICY IF EXISTS "Employee select" ON public.employees;
DROP POLICY IF EXISTS "Employee insert" ON public.employees;
DROP POLICY IF EXISTS "Employee update" ON public.employees;
DROP POLICY IF EXISTS "Employee delete" ON public.employees;
DROP POLICY IF EXISTS "Location access for employees" ON public.employees;
DROP POLICY IF EXISTS "View employees" ON public.employees;
DROP POLICY IF EXISTS "Manage employees" ON public.employees;
DROP POLICY IF EXISTS "Organization employee view" ON public.employees;

-- Use the non-recursive helpers
CREATE POLICY "Employee select" ON public.employees
    FOR SELECT TO authenticated USING (
        user_id = auth.uid()
        OR organization_id IN (SELECT org_id FROM public.get_my_organizations())
    );

CREATE POLICY "Employee insert" ON public.employees
    FOR INSERT TO authenticated WITH CHECK (public.check_is_manager(organization_id));

CREATE POLICY "Employee update" ON public.employees
    FOR UPDATE TO authenticated USING (public.check_is_manager(organization_id) OR user_id = auth.uid());

CREATE POLICY "Employee delete" ON public.employees
    FOR DELETE TO authenticated USING (public.check_is_manager(organization_id));
