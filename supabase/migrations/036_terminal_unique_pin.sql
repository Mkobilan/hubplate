-- Migration 036: Terminal Unique PIN
-- Ensures that pin_code is unique within an organization for terminal login.

-- 1. First, make sure we don't have any existing duplicates that would break the constraint
-- (In a real scenario, we might need to handle this more gracefully, but here we'll assume clean state or manual cleanup)

-- 2. Add the unique constraint
ALTER TABLE public.employees
ADD CONSTRAINT employees_organization_pin_unique UNIQUE (organization_id, pin_code);

-- 3. Add a check constraint for pin length (4 or 6 digits)
ALTER TABLE public.employees
ADD CONSTRAINT employees_pin_code_check CHECK (pin_code ~ '^\d{4}$|^\d{6}$');
