-- Loyalty System Repair & Permissions Update (Final Version)

-- 1. Ensure loyalty_programs table exists
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'HubPlate Rewards',
    points_per_dollar INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id)
);

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

-- 2. Ensure loyalty_tiers table exists
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_points INTEGER NOT NULL DEFAULT 0,
    perks TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id, name)
);

ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;

-- 3. Ensure customers table has correctly named columns
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_loyalty_member BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 4. Update/Re-create RLS Policies to allow both Owners AND Employees
DROP POLICY IF EXISTS "Location access for loyalty_programs" ON public.loyalty_programs;
DROP POLICY IF EXISTS "Location access for loyalty_tiers" ON public.loyalty_tiers;
DROP POLICY IF EXISTS "Location access for loyalty_rewards" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "Location access for customers" ON public.customers;

-- Program Policies
CREATE POLICY "Loyalty programs access" ON public.loyalty_programs
    FOR ALL USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = auth.uid()) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = auth.uid())
    );

-- Tiers Policies
CREATE POLICY "Loyalty tiers access" ON public.loyalty_tiers
    FOR ALL USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = auth.uid()) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = auth.uid())
    );

-- Rewards Policies
CREATE POLICY "Loyalty rewards access" ON public.loyalty_rewards
    FOR ALL USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = auth.uid()) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = auth.uid())
    );

-- Customers Policy
CREATE POLICY "Customers location access" ON public.customers
    FOR ALL USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = auth.uid()) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = auth.uid())
    );

-- 5. Re-initialize default data
INSERT INTO public.loyalty_programs (location_id)
SELECT id FROM public.locations
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.loyalty_tiers (location_id, name, min_points, perks)
SELECT 
    l.id, 
    t.name, 
    t.min_points, 
    t.perks
FROM public.locations l
CROSS JOIN (
    VALUES 
        ('Bronze', 0, ARRAY['Birthday reward', 'Early access to specials']),
        ('Silver', 500, ARRAY['5% off all orders', 'Free appetizer monthly']),
        ('Gold', 1500, ARRAY['10% off all orders', 'Priority seating', 'Exclusive events'])
) AS t(name, min_points, perks)
ON CONFLICT (location_id, name) DO NOTHING;
