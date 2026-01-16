-- Add recorded_by_name column to physical_inventory_sessions
ALTER TABLE public.physical_inventory_sessions 
ADD COLUMN IF NOT EXISTS recorded_by_name TEXT;

-- Update existing records if any (optional, but good for consistency)
-- For now, they will just be NULL.
