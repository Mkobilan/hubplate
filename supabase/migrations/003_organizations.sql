-- Migration 003: Organizations Support
-- This adds a top-level organization structure to group locations and employees.

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_plan TEXT DEFAULT 'pro', -- Default to pro as requested for first users
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add organization_id to core tables
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.employee_invites ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 3. Migration logic: Group existing locations by owner into organizations
DO $$
DECLARE
    loc_record RECORD;
    org_id UUID;
BEGIN
    -- For each unique owner who has a location, create one organization
    FOR loc_record IN 
        SELECT DISTINCT owner_id, name FROM public.locations
    LOOP
        -- Check if an organization for this owner already exists
        SELECT id INTO org_id FROM public.organizations WHERE owner_id = loc_record.owner_id LIMIT 1;
        
        IF org_id IS NULL THEN
            INSERT INTO public.organizations (name, owner_id, subscription_plan)
            VALUES (loc_record.name || ' Organization', loc_record.owner_id, 'pro')
            RETURNING id INTO org_id;
        END IF;

        -- Link the location to the organization
        UPDATE public.locations 
        SET organization_id = org_id 
        WHERE owner_id = loc_record.owner_id;

        -- Link employees of these locations to the organization
        UPDATE public.employees e
        SET organization_id = org_id
        FROM public.locations l
        WHERE e.location_id = l.id AND l.organization_id = org_id;

        -- Link pending invites
        UPDATE public.employee_invites ei
        SET organization_id = org_id
        FROM public.locations l
        WHERE ei.location_id = l.id AND l.organization_id = org_id;
    END LOOP;
END $$;

-- 4. Create a helper function to break RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_organizations()
RETURNS TABLE (org_id UUID) AS $$
BEGIN
    RETURN QUERY 
    SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    UNION
    SELECT organization_id FROM public.employees WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create an atomic join function (Fixes 401, Join errors, and NULL org_id)
CREATE OR REPLACE FUNCTION public.join_organization_via_token(token_val text, f_name text, l_name text)
RETURNS void AS $$
DECLARE
    invite_record RECORD;
    org_id UUID;
BEGIN
    -- 1. Check if user is already an employee in this location (prevent duplicate errors)
    IF EXISTS (
        SELECT 1 FROM public.employees 
        WHERE user_id = auth.uid() 
        AND location_id = (SELECT location_id FROM public.employee_invites WHERE token = token_val::UUID LIMIT 1)
    ) THEN
        RETURN;
    END IF;

    -- 2. Verify invite
    SELECT * INTO invite_record 
    FROM public.employee_invites 
    WHERE token = token_val::UUID AND status = 'pending' AND expires_at > NOW();
    
    -- If already accepted, just return (idempotent)
    IF invite_record IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.employee_invites WHERE token = token_val::UUID AND status = 'accepted') THEN
            RETURN;
        END IF;
        RAISE EXCEPTION 'Invalid, expired, or already used invitation';
    END IF;

    -- 3. Determine Organization ID (self-healing for missing data in invite)
    org_id := invite_record.organization_id;
    IF org_id IS NULL THEN
        SELECT organization_id INTO org_id 
        FROM public.locations 
        WHERE id = invite_record.location_id;
    END IF;

    -- 4. Create employee record
    INSERT INTO public.employees (
        user_id, organization_id, location_id, 
        first_name, last_name, role, 
        hourly_rate, is_active
    )
    VALUES (
        auth.uid(), org_id, invite_record.location_id, 
        f_name, l_name, invite_record.role, 
        invite_record.hourly_rate, true
    );

    -- 5. Mark invite as accepted
    UPDATE public.employee_invites SET status = 'accepted' WHERE token = token_val::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Set RLS Policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View organization" ON public.organizations;
DROP POLICY IF EXISTS "Manage organization" ON public.organizations;
DROP POLICY IF EXISTS "Organization select" ON public.organizations;
DROP POLICY IF EXISTS "Organization update" ON public.organizations;

CREATE POLICY "Organization select" ON public.organizations
    FOR SELECT TO authenticated USING (
        id IN (SELECT org_id FROM get_my_organizations())
    );

CREATE POLICY "Organization update" ON public.organizations
    FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid())) WITH CHECK (owner_id = (SELECT auth.uid()));



-- 6. Refactor Locations RLS
DROP POLICY IF EXISTS "View locations" ON public.locations;
DROP POLICY IF EXISTS "Modify locations" ON public.locations;
DROP POLICY IF EXISTS "Manage locations" ON public.locations;
DROP POLICY IF EXISTS "Location select" ON public.locations;
DROP POLICY IF EXISTS "Location insert" ON public.locations;
DROP POLICY IF EXISTS "Location update" ON public.locations;
DROP POLICY IF EXISTS "Location delete" ON public.locations;

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

-- 7. Refactor Employees RLS
DROP POLICY IF EXISTS "View employees" ON public.employees;
DROP POLICY IF EXISTS "Join organization" ON public.employees;
DROP POLICY IF EXISTS "Manage employees" ON public.employees;
DROP POLICY IF EXISTS "Organization employee view" ON public.employees;
DROP POLICY IF EXISTS "Employee select" ON public.employees;
DROP POLICY IF EXISTS "Employee insert" ON public.employees;
DROP POLICY IF EXISTS "Employee update" ON public.employees;
DROP POLICY IF EXISTS "Employee delete" ON public.employees;

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

-- 8. Update Employee Invites RLS
DROP POLICY IF EXISTS "Manage invites" ON public.employee_invites;
DROP POLICY IF EXISTS "View invite public" ON public.employee_invites;

CREATE POLICY "Manage invites" ON public.employee_invites
    FOR ALL USING (organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid())));

CREATE POLICY "View invite public" ON public.employee_invites
    FOR SELECT USING (status = 'pending' AND expires_at > NOW());

-- 9. Apply organization-aware RLS to other tables
-- Menu Items
DROP POLICY IF EXISTS "Org access for menu_items" ON public.menu_items;
CREATE POLICY "Org access for menu_items" ON public.menu_items
    FOR ALL USING (location_id IN (SELECT id FROM public.locations WHERE organization_id IN (SELECT org_id FROM get_my_organizations())));

-- Orders
DROP POLICY IF EXISTS "Org access for orders" ON public.orders;
CREATE POLICY "Org access for orders" ON public.orders
    FOR ALL USING (location_id IN (SELECT id FROM public.locations WHERE organization_id IN (SELECT org_id FROM get_my_organizations())));
