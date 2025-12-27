-- Migration 041: Role-Based Pay Rates (Robust Version)

-- 1. Update employee_roles table
ALTER TABLE public.employee_roles 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);

-- 2. Update time_entries table
-- Ensuring hourly_rate exists here too just in case
ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);

ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS role TEXT;

-- 3. Comments
COMMENT ON COLUMN public.employee_roles.hourly_rate IS 'Custom hourly rate for this specific role rank.';
COMMENT ON COLUMN public.time_entries.role IS 'The role the employee selected when clocking in for this shift.';
