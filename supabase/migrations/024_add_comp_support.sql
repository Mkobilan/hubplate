-- Migration 024: Add Comp Support
-- Adds ability to mark individual order items as complimentary (free)

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS is_comped BOOLEAN DEFAULT FALSE;

-- Optional: Add index for performance if we eventually report on comped items
CREATE INDEX IF NOT EXISTS idx_order_items_comped ON public.order_items(is_comped) WHERE is_comped = TRUE;
