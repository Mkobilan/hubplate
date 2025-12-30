-- Migration: Add termination_date to employees table
-- This column tracks when an employee was discontinued

ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Update RLS if needed (usually not needed for just a new column if existing policies are broad)
-- Just ensuring its presence for the application logic.
