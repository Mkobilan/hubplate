-- Migration 040: Add Ranked Roles for Employees

-- 1. Create employee_roles table for secondary and third roles
CREATE TABLE IF NOT EXISTS public.employee_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL,
    rank INTEGER NOT NULL CHECK (rank >= 2), -- 1 is reserved for the primary role in employees table
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, role),
    UNIQUE(employee_id, rank)
);

-- 2. Add 'expo' to the role check constraints
-- First, finding and dropping existing constraints on employees and employee_invites
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

-- Add updated constraints including 'expo'
ALTER TABLE public.employees 
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('owner', 'manager', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

ALTER TABLE public.employee_invites 
ADD CONSTRAINT employee_invites_role_check 
CHECK (role IN ('owner', 'manager', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

-- Add constraint to employee_roles as well
ALTER TABLE public.employee_roles
ADD CONSTRAINT employee_roles_role_check
CHECK (role IN ('owner', 'manager', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

-- 3. Enable RLS and add policies for employee_roles
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View employee roles" ON public.employee_roles
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id
            AND (
                e.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
                OR e.organization_id IN (SELECT organization_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
            )
        )
    );

CREATE POLICY "Manage employee roles" ON public.employee_roles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id
            AND (
                e.organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
                OR EXISTS (
                    SELECT 1 FROM public.employees mgr
                    WHERE mgr.user_id = (SELECT auth.uid())
                    AND mgr.role IN ('manager', 'owner')
                    AND mgr.organization_id = e.organization_id
                )
            )
        )
    );

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE employee_roles;
