-- Migration 012: Multi-Day Staffing Rules
-- Replaces single day_of_week with days_of_week array

-- 1. Add new column as array
ALTER TABLE public.staffing_rules ADD COLUMN IF NOT EXISTS days_of_week INTEGER[];

-- 2. Migrate existing data
UPDATE public.staffing_rules 
SET days_of_week = CASE 
    WHEN day_of_week IS NULL THEN '{0,1,2,3,4,5,6}'::INTEGER[]
    ELSE ARRAY[day_of_week]
END;

-- 3. Set constraints and defaults
ALTER TABLE public.staffing_rules ALTER COLUMN days_of_week SET NOT NULL;
ALTER TABLE public.staffing_rules ALTER COLUMN days_of_week SET DEFAULT '{0,1,2,3,4,5,6}'::INTEGER[];

-- 4. Clean up old column
ALTER TABLE public.staffing_rules DROP COLUMN IF EXISTS day_of_week;
