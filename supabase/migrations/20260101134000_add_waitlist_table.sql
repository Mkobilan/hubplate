-- Add waitlist table
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    party_size INTEGER DEFAULT 2,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'seated', 'cancelled', 'no_show')),
    notes TEXT,
    estimated_wait_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    seated_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Location access for waitlist" ON public.waitlist
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid()) OR 
            id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON public.waitlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_waitlist_location ON public.waitlist(location_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON public.waitlist(created_at ASC);
