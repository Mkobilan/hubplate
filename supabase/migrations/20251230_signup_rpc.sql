-- Atomic function to initialize a new organization
-- This bypasses RLS issues during signup by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.initialize_new_organization(
    org_name TEXT,
    owner_first_name TEXT,
    owner_last_name TEXT
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
    new_loc_id UUID;
BEGIN
    -- 1. Create Organization
    INSERT INTO public.organizations (name, owner_id, subscription_plan, onboarding_status)
    VALUES (org_name, auth.uid(), 'pro', 'none')
    RETURNING id INTO new_org_id;

    -- 2. Create first Location
    INSERT INTO public.locations (name, owner_id, organization_id, is_active)
    VALUES (org_name, auth.uid(), new_org_id, true)
    RETURNING id INTO new_loc_id;

    -- 3. Create employee record for owner
    INSERT INTO public.employees (
        user_id, 
        organization_id, 
        location_id, 
        first_name, 
        last_name, 
        role, 
        is_active
    )
    VALUES (
        auth.uid(), 
        new_org_id, 
        new_loc_id, 
        owner_first_name, 
        owner_last_name, 
        'owner', 
        true
    );

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
