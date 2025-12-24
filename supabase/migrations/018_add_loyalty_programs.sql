-- Add loyalty_programs table and loyalty membership flag

-- 1. Create loyalty_programs table
CREATE TABLE IF NOT EXISTS public.loyalty_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'HubPlate Rewards',
    points_per_dollar INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id)
);

-- 2. Add is_loyalty_member to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_loyalty_member BOOLEAN DEFAULT FALSE;

-- 3. Enable RLS on loyalty_programs
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Location access for loyalty_programs" ON public.loyalty_programs
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
    );

-- 4. Initialize default loyalty programs for existing locations
INSERT INTO public.loyalty_programs (location_id)
SELECT id FROM public.locations
ON CONFLICT (location_id) DO NOTHING;

-- 5. Add trigger for updated_at
CREATE TRIGGER update_loyalty_programs_updated_at BEFORE UPDATE ON public.loyalty_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
