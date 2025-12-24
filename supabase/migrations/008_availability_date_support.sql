-- Add date column to availability table to support specific date availability
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS date DATE;

-- Update unique constraint to allow either (employee_id, day_of_week) for repeating OR (employee_id, date) for specific days
-- First, drop the old unique constraint if it exists (it might have been created by upsert logic or manual migration)
DO $$ 
BEGIN
    -- Drop legacy constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'availability_employee_id_day_of_week_key') THEN
        ALTER TABLE public.availability DROP CONSTRAINT availability_employee_id_day_of_week_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_employee_day') THEN
        ALTER TABLE public.availability DROP CONSTRAINT unique_employee_day;
    END IF;
END $$;


-- Create a partial unique index for repeating availability (where date is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_repeating 
ON public.availability (employee_id, day_of_week) 
WHERE date IS NULL;

-- Create a unique index for specific date availability
-- We remove the WHERE clause to allow it to match the ON CONFLICT (employee_id, date) specification in upsert
DROP INDEX IF EXISTS idx_availability_specific;
CREATE UNIQUE INDEX idx_availability_specific 
ON public.availability (employee_id, date);

