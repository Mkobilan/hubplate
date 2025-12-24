-- Add loyalty_tiers table to store per-location membership tiers

-- 1. Create loyalty_tiers table
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

-- 2. Enable RLS
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Location access for loyalty_tiers" ON public.loyalty_tiers
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
    );

-- 3. Initialize default tiers for existing locations
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

-- 4. Add trigger for updated_at
CREATE TRIGGER update_loyalty_tiers_updated_at BEFORE UPDATE ON public.loyalty_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
