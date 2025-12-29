-- Create marketing_campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('email', 'sms', 'push')) NOT NULL,
    status TEXT CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled', 'running')) DEFAULT 'draft',
    subject TEXT,
    message TEXT,
    target_audience JSONB,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Add RLS Policy if it doesn't exist (using DO block to avoid error if exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'marketing_campaigns' 
        AND policyname = 'Location access for marketing_campaigns'
    ) THEN
        CREATE POLICY "Location access for marketing_campaigns" ON public.marketing_campaigns
            FOR ALL USING (
                location_id IN (
                    SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
                )
            );
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.marketing_campaigns TO authenticated;
GRANT ALL ON public.marketing_campaigns TO service_role;
