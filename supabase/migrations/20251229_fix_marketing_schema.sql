-- Ensure all columns exist in marketing_campaigns table
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS target_audience JSONB,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled', 'running')) DEFAULT 'draft';

-- Update cache
NOTIFY pgrst, 'reload config';
