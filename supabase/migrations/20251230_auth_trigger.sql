-- MASTER FIX (v3): Atomic Auth Trigger
-- This removes the need for any manual RPC calls during signup.
-- The database will automatically handle setup the moment Auth succeeds.

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    new_loc_id UUID;
    org_name TEXT;
    f_name TEXT;
    l_name TEXT;
BEGIN
    -- Only run for owners (role is set in SignupPage.tsx raw_user_meta_data)
    IF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
        -- Get names from metadata
        org_name := COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My Restaurant');
        f_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'Owner');
        l_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');

        -- 1. Create Organization
        INSERT INTO public.organizations (name, owner_id, subscription_plan, onboarding_status)
        VALUES (org_name, NEW.id, 'pro', 'none')
        RETURNING id INTO new_org_id;

        -- 2. Create first Location
        INSERT INTO public.locations (name, owner_id, organization_id, is_active)
        VALUES (org_name, NEW.id, new_org_id, true)
        RETURNING id INTO new_loc_id;

        -- 3. Create employee record for owner
        INSERT INTO public.employees (
            user_id, organization_id, location_id, 
            first_name, last_name, role, is_active
        )
        VALUES (
            NEW.id, new_org_id, new_loc_id, 
            f_name, l_name, 'owner', true
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Bind the trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
