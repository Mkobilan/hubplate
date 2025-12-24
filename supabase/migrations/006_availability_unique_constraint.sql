-- Migration 006: Availability Unique Constraint
-- Adds a unique constraint to ensure each employee only has one availability record per day.
-- This is required for the 'upsert' operation used in the Profile page.

-- 1. Remove any potential duplicate records before adding the constraint
-- (Keeps the latest updated record for each day)
DELETE FROM public.availability a
USING public.availability b
WHERE a.id < b.id 
  AND a.employee_id = b.employee_id 
  AND a.day_of_week = b.day_of_week;

-- 2. Add the unique constraint
ALTER TABLE public.availability 
ADD CONSTRAINT unique_employee_day UNIQUE (employee_id, day_of_week);
