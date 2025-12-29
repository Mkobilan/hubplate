-- Update check constraint for status to include 'running'
ALTER TABLE public.marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_status_check;

ALTER TABLE public.marketing_campaigns 
ADD CONSTRAINT marketing_campaigns_status_check 
CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled', 'running'));

-- Force cache reload to be safe
NOTIFY pgrst, 'reload config';
