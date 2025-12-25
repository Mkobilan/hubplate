-- Migration 023: Open Schedule Visibility
-- This update allows all employees within an organization to view all shifts 
-- for that organization, enabling them to see the full schedule.

-- 1. Drop the restrictive "View own shifts" policy
DROP POLICY IF EXISTS "View own shifts" ON public.shifts;

-- 2. Create a new policy that allows viewing all shifts in the organization
DROP POLICY IF EXISTS "View organization shifts" ON public.shifts;
DROP POLICY IF EXISTS "View shifts" ON public.shifts;
DROP POLICY IF EXISTS "Shift select" ON public.shifts;

CREATE POLICY "Shift select" ON public.shifts
    FOR SELECT TO authenticated USING (
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );

-- 3. Ensure "Manage org shifts" remains for administrative actions
-- (Already exists from migration 004, but we keep it functionally separate from SELECT)
