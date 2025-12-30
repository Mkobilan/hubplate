-- Migration 20251230_add_gm_agm_roles: Add GM/AGM roles and update RLS policies

-- 1. Update role check constraints
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Update public.employees
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.employees'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;

    -- Update public.employee_invites
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.employee_invites'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.employee_invites DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;

    -- Update public.employee_roles
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.employee_roles'::regclass 
        AND contype = 'c' 
        AND pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.employee_roles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.employees 
ADD CONSTRAINT employees_role_check 
CHECK (role IN ('owner', 'manager', 'agm', 'gm', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

ALTER TABLE public.employee_invites 
ADD CONSTRAINT employee_invites_role_check 
CHECK (role IN ('owner', 'manager', 'agm', 'gm', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

ALTER TABLE public.employee_roles
ADD CONSTRAINT employee_roles_role_check
CHECK (role IN ('owner', 'manager', 'agm', 'gm', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

-- 1.5 Update check_is_manager function to be more robust
CREATE OR REPLACE FUNCTION public.check_is_manager(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        -- Is the Organization Owner?
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = target_org_id AND owner_id = (SELECT auth.uid())
        )
        OR
        -- Is an employee with manager/owner/gm/agm role?
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND organization_id = target_org_id 
            AND role IN ('owner', 'manager', 'gm', 'agm')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update RLS Policies across all management-related tables

-- Staffing Templates
DROP POLICY IF EXISTS "Manage staffing_templates" ON public.staffing_templates;
DROP POLICY IF EXISTS "Manage org staffing_templates" ON public.staffing_templates;
CREATE POLICY "Manage staffing_templates" ON public.staffing_templates
FOR ALL USING (public.check_is_manager(organization_id));

-- Staffing Rules
DROP POLICY IF EXISTS "Manage staffing_rules via template" ON public.staffing_rules;
CREATE POLICY "Manage staffing_rules via template" ON public.staffing_rules
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.staffing_templates st
        WHERE st.id = public.staffing_rules.template_id
        AND public.check_is_manager(st.organization_id)
    )
);

-- Schedule Batches
DROP POLICY IF EXISTS "Manage schedule_batches" ON public.schedule_batches;
DROP POLICY IF EXISTS "Manage org schedule_batches" ON public.schedule_batches;
CREATE POLICY "Manage schedule_batches" ON public.schedule_batches
FOR ALL USING (public.check_is_manager(organization_id));

-- Shifts
DROP POLICY IF EXISTS "Manage shifts" ON public.shifts;
DROP POLICY IF EXISTS "Manage org shifts" ON public.shifts;
CREATE POLICY "Manage shifts" ON public.shifts
FOR ALL USING (public.check_is_manager(organization_id));

-- Shift Swap Requests
DROP POLICY IF EXISTS "Managers can manage all shift swap requests" ON public.shift_swap_requests;
CREATE POLICY "Managers can manage all shift swap requests" ON public.shift_swap_requests
FOR ALL USING (public.check_is_manager(organization_id));

-- Employee Roles (Table)
DROP POLICY IF EXISTS "Manage employee roles" ON public.employee_roles;
CREATE POLICY "Manage employee roles" ON public.employee_roles
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = employee_id
            AND public.check_is_manager(e.organization_id)
        )
    );

-- Availability
DROP POLICY IF EXISTS "Availability select" ON public.availability;
CREATE POLICY "Availability select" ON public.availability
    FOR SELECT TO authenticated USING (
        public.check_is_manager(organization_id)
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Availability insert" ON public.availability;
CREATE POLICY "Availability insert" ON public.availability
    FOR INSERT TO authenticated WITH CHECK (
        public.check_is_manager(organization_id)
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Availability update" ON public.availability;
CREATE POLICY "Availability update" ON public.availability
    FOR UPDATE TO authenticated USING (
        public.check_is_manager(organization_id)
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Availability delete" ON public.availability;
CREATE POLICY "Availability delete" ON public.availability
    FOR DELETE TO authenticated USING (
        public.check_is_manager(organization_id)
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

-- Time Entries
DROP POLICY IF EXISTS "Time entry select" ON public.time_entries;
CREATE POLICY "Time entry select" ON public.time_entries
    FOR SELECT TO authenticated USING (
        public.check_is_manager(organization_id)
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Time entry insert" ON public.time_entries;
CREATE POLICY "Time entry insert" ON public.time_entries
    FOR INSERT TO authenticated WITH CHECK (
        public.check_is_manager(organization_id)
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Time entry update" ON public.time_entries;
CREATE POLICY "Time entry update" ON public.time_entries
    FOR UPDATE TO authenticated USING (
        public.check_is_manager(organization_id)
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Time entry delete" ON public.time_entries;
CREATE POLICY "Time entry delete" ON public.time_entries
    FOR DELETE TO authenticated USING (public.check_is_manager(organization_id));

-- Locations
DROP POLICY IF EXISTS "Location insert" ON public.locations;
CREATE POLICY "Location insert" ON public.locations
    FOR INSERT TO authenticated WITH CHECK (public.check_is_manager(organization_id));

DROP POLICY IF EXISTS "Location update" ON public.locations;
CREATE POLICY "Location update" ON public.locations
    FOR UPDATE TO authenticated USING (public.check_is_manager(organization_id));

DROP POLICY IF EXISTS "Location delete" ON public.locations;
CREATE POLICY "Location delete" ON public.locations
    FOR DELETE TO authenticated USING (public.check_is_manager(organization_id));

-- Employees
DROP POLICY IF EXISTS "Employee insert" ON public.employees;
CREATE POLICY "Employee insert" ON public.employees
    FOR INSERT TO authenticated WITH CHECK (public.check_is_manager(organization_id));

DROP POLICY IF EXISTS "Employee update" ON public.employees;
CREATE POLICY "Employee update" ON public.employees
    FOR UPDATE TO authenticated USING (public.check_is_manager(organization_id) OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Employee delete" ON public.employees;
CREATE POLICY "Employee delete" ON public.employees
    FOR DELETE TO authenticated USING (public.check_is_manager(organization_id));

-- Invites
DROP POLICY IF EXISTS "Manage invites" ON public.employee_invites;
CREATE POLICY "Manage invites" ON public.employee_invites
    FOR ALL USING (public.check_is_manager(organization_id));
