-- Migration 014: Add unique constraint to prevent duplicate employees
-- This prevents race conditions from creating duplicate employee records

-- First, clean up any existing duplicates (keep the first one created)
DELETE FROM public.employees a
USING public.employees b
WHERE a.id > b.id 
  AND a.user_id = b.user_id 
  AND a.location_id = b.location_id;

-- Add unique constraint on user_id + location_id combination
-- This ensures a user can only be an employee once per location
ALTER TABLE public.employees
ADD CONSTRAINT employees_user_location_unique UNIQUE (user_id, location_id);

-- Add an index to improve lookup performance for the duplicate check in join_organization_via_token
CREATE INDEX IF NOT EXISTS idx_employees_user_location 
ON public.employees(user_id, location_id);
