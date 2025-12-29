-- Comprehensive fix for marketing_campaigns table
-- explicit adding of 'type' column which was causing errors
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('email', 'sms', 'push')) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE;

-- Re-run these just in case they were missed
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS target_audience JSONB,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled', 'running')) DEFAULT 'status';

-- Force cache reload
NOTIFY pgrst, 'reload config';
