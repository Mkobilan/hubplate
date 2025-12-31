-- DIAGNOSTIC RPC: Initialization with checks
CREATE OR REPLACE FUNCTION public.initialize_new_organization(
    org_name TEXT,
    owner_uuid UUID,
    owner_first_name TEXT,
    owner_last_name TEXT
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
    new_loc_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- 1. Check if user exists in auth.users
    SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = owner_uuid) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with ID % does not exist in auth.users table yet.', owner_uuid;
    END IF;

    -- 2. Create Organization
    INSERT INTO public.organizations (name, owner_id, subscription_plan, onboarding_status)
    VALUES (org_name, owner_uuid, 'pro', 'none')
    RETURNING id INTO new_org_id;

    -- 3. Create first Location
    INSERT INTO public.locations (name, owner_id, organization_id, is_active)
    VALUES (org_name, owner_uuid, new_org_id, true)
    RETURNING id INTO new_loc_id;

    -- 4. Create employee record for owner
    INSERT INTO public.employees (
        user_id, organization_id, location_id, 
        first_name, last_name, role, is_active
    )
    VALUES (
        owner_uuid, new_org_id, new_loc_id, 
        owner_first_name, owner_last_name, 'owner', true
    );

    RETURN new_org_id;
EXCEPTION WHEN OTHERS THEN
    -- Rethrow with more context if needed
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
