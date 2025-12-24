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
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Manage org shifts" ON public.shifts;
CREATE POLICY "Manage org shifts" ON public.shifts
    FOR ALL USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR 
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() 
            AND role IN ('manager', 'owner') 
            AND organization_id = public.shifts.organization_id
        )
    );

-- Availability:
-- 1. Employees can view and manage their own availability
-- 2. Managers can view all availability in org
DROP POLICY IF EXISTS "Manage own availability" ON public.availability;
CREATE POLICY "Manage own availability" ON public.availability
    FOR ALL USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "View org availability" ON public.availability;
CREATE POLICY "View org availability" ON public.availability
    FOR SELECT USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR 
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() 
            AND role IN ('manager', 'owner') 
            AND organization_id = public.availability.organization_id
        )
    );

-- Time Entries:
-- 1. Employees can view/insert their own time entries
-- 2. Managers can manage all time entries in org
DROP POLICY IF EXISTS "View own time entries" ON public.time_entries;
CREATE POLICY "View own time entries" ON public.time_entries
    FOR SELECT USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Insert own time entries" ON public.time_entries;
CREATE POLICY "Insert own time entries" ON public.time_entries
    FOR INSERT WITH CHECK (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Manage org time entries" ON public.time_entries;
CREATE POLICY "Manage org time entries" ON public.time_entries
    FOR ALL USING (
        organization_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR 
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() 
            AND role IN ('manager', 'owner') 
            AND organization_id = public.time_entries.organization_id
        )
    );
