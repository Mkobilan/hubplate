-- Add tax_rate column to locations table
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;

-- Optional: Update existing locations to 8.75 if you want to keep the current rate
-- UPDATE public.locations SET tax_rate = 8.75 WHERE tax_rate = 0;
