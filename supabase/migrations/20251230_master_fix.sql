-- MASTER FIX: Onboarding & Subscription Database Support (v2)
-- This version adds an explicit owner_uuid to the initialization RPC 
-- to prevent identity crossover issues.

-- 1. ADD MISSING COLUMNS
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS has_completed_tour BOOLEAN DEFAULT false;

-- 2. ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations(subscription_status);

-- 3. CREATE INITIALIZATION RPC (v2)
-- Now accepts an explicit owner_uuid to ensure correct ownership regardless of active session
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
BEGIN
    -- 1. Create Organization
    INSERT INTO public.organizations (name, owner_id, subscription_plan, onboarding_status)
    VALUES (org_name, owner_uuid, 'pro', 'none')
    RETURNING id INTO new_org_id;

    -- 2. Create first Location
    INSERT INTO public.locations (name, owner_id, organization_id, is_active)
    VALUES (org_name, owner_uuid, new_org_id, true)
    RETURNING id INTO new_loc_id;

    -- 3. Create employee record for owner
    INSERT INTO public.employees (
        user_id, organization_id, location_id, 
        first_name, last_name, role, is_active
    )
    VALUES (
        owner_uuid, new_org_id, new_loc_id, 
        owner_first_name, owner_last_name, 'owner', true
    );

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
