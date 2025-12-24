-- Migration 013: Add Dishwasher Role to Check Constraints (REFINED)

-- 1. Update employees table role check
-- We drop any existing role checks to make room for the new one
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check1; -- Catch common auto-names

-- Alternative: Find and drop any constraint containing 'role' in employees
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.employees'::regclass 
        AND (conname LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%role%')
        AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('owner', 'manager', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver'));

-- 2. Update employee_invites table role check
ALTER TABLE public.employee_invites DROP CONSTRAINT IF EXISTS employee_invites_role_check;

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.employee_invites'::regclass 
        AND (conname LIKE '%role%' OR pg_get_constraintdef(oid) LIKE '%role%')
        AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE public.employee_invites DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.employee_invites 
ADD CONSTRAINT employee_invites_role_check 
CHECK (role IN ('owner', 'manager', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver'));
