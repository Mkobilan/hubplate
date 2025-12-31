-- Comprehensive migration to fix RLS for signup flow
-- This ensures owners can create and read their records during initial registration

-- 1. Fix Organizations Policies
DROP POLICY IF EXISTS "Organization select" ON public.organizations;
DROP POLICY IF EXISTS "Organization insert" ON public.organizations;
DROP POLICY IF EXISTS "Organization update" ON public.organizations;

-- Allow owners to see their own org, and employees to see their assigned org
CREATE POLICY "Organization select" ON public.organizations
    FOR SELECT TO authenticated 
    USING (owner_id = auth.uid() OR id IN (SELECT organization_id FROM public.employees WHERE user_id = auth.uid()));

-- Allow new owners to create their org
CREATE POLICY "Organization insert" ON public.organizations
    FOR INSERT TO authenticated 
    WITH CHECK (owner_id = auth.uid());

-- Allow owners to update their org
CREATE POLICY "Organization update" ON public.organizations
    FOR UPDATE TO authenticated 
    USING (owner_id = auth.uid());

-- 2. Fix Locations Policies (so the first location can be created)
DROP POLICY IF EXISTS "Location insert" ON public.locations;
CREATE POLICY "Location insert" ON public.locations
    FOR INSERT TO authenticated 
    WITH CHECK (owner_id = auth.uid() OR organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));

-- 3. Fix Employees Policies (so the owner's employee record can be created)
DROP POLICY IF EXISTS "Employee insert" ON public.employees;
CREATE POLICY "Employee insert" ON public.employees
    FOR INSERT TO authenticated 
    WITH CHECK (user_id = auth.uid() OR organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid()));
