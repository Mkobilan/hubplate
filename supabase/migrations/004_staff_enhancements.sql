-- Migration 004: Staff Enhancements
-- Adds organization_id to shifts, availability, and time_entries
-- Configures RLS for granular staff access

-- 1. Add organization_id columns
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.availability ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Backfill organization_id
-- For shifts
UPDATE public.shifts s
SET organization_id = l.organization_id
FROM public.locations l
WHERE s.location_id = l.id AND s.organization_id IS NULL;

-- For availability
UPDATE public.availability a
SET organization_id = e.organization_id
FROM public.employees e
WHERE a.employee_id = e.id AND a.organization_id IS NULL;

-- For time_entries
UPDATE public.time_entries t
SET organization_id = l.organization_id
FROM public.locations l
WHERE t.location_id = l.id AND t.organization_id IS NULL;

-- 3. Enable RLS (already enabled in schema.sql but making sure)
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies

-- Shifts: 
-- 1. Employees can view their own shifts
-- 2. Managers/Owners can manage all shifts in org
DROP POLICY IF EXISTS "View own shifts" ON public.shifts;
CREATE POLICY "View own shifts" ON public.shifts
    FOR SELECT USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
    );

DROP POLICY IF EXISTS "Manage org shifts" ON public.shifts;
DROP POLICY IF EXISTS "Manage shifts" ON public.shifts;
CREATE POLICY "Manage shifts" ON public.shifts
    FOR ALL USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR 
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND organization_id = public.shifts.organization_id
        )
    );

-- Availability:
-- Managers/Owners can manage all availability in org
-- Employees can view and manage their own availability
DROP POLICY IF EXISTS "Availability access" ON public.availability;
DROP POLICY IF EXISTS "Manage availability" ON public.availability;
DROP POLICY IF EXISTS "Self availability access" ON public.availability;
DROP POLICY IF EXISTS "Availability select" ON public.availability;
DROP POLICY IF EXISTS "Availability insert" ON public.availability;
DROP POLICY IF EXISTS "Availability update" ON public.availability;
DROP POLICY IF EXISTS "Availability delete" ON public.availability;

CREATE POLICY "Availability select" ON public.availability
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = (SELECT auth.uid()) 
            AND role IN ('manager', 'owner') 
            AND organization_id = public.availability.organization_id
        )
    );

CREATE POLICY "Availability insert" ON public.availability
    FOR INSERT TO authenticated WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Availability update" ON public.availability
    FOR UPDATE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Availability delete" ON public.availability
    FOR DELETE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

-- Time Entries:
-- Managers/Owners can manage all time entries in org
-- Employees can view/insert their own time entries
DROP POLICY IF EXISTS "Time entry access" ON public.time_entries;
DROP POLICY IF EXISTS "Manage time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Self time entries access" ON public.time_entries;
DROP POLICY IF EXISTS "Time entry select" ON public.time_entries;
DROP POLICY IF EXISTS "Time entry insert" ON public.time_entries;
DROP POLICY IF EXISTS "Time entry update" ON public.time_entries;
DROP POLICY IF EXISTS "Time entry delete" ON public.time_entries;

CREATE POLICY "Time entry select" ON public.time_entries
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Time entry insert" ON public.time_entries
    FOR INSERT TO authenticated WITH CHECK (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Time entry update" ON public.time_entries
    FOR UPDATE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR employee_id IN (SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );

CREATE POLICY "Time entry delete" ON public.time_entries
    FOR DELETE TO authenticated USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = (SELECT auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid()) AND e.role IN ('manager', 'owner') AND e.organization_id = organization_id
        )
    );
