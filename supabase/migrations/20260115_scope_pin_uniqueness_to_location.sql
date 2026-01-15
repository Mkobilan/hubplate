-- Migration to scope pincode uniqueness to location instead of organization
-- This allows different locations within the same organization to use the same PINs

-- 1. Drop the old organization-level constraint
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_organization_pin_unique;

-- 2. Add the new location-level constraint
-- We use UNIQUE (location_id, pin_code) because PINs only need to be unique within a single restaurant
-- NULL values in pin_code are allowed multiple times because of standard SQL unique constraint behavior
ALTER TABLE public.employees
ADD CONSTRAINT employees_location_pin_unique UNIQUE (location_id, pin_code);
