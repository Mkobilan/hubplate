-- Migration 023: Open Schedule Visibility
-- This update allows all employees within an organization to view all shifts 
-- for that organization, enabling them to see the full schedule.

-- 1. Drop the restrictive "View own shifts" policy
DROP POLICY IF EXISTS "View own shifts" ON public.shifts;

-- 2. Create a new policy that allows viewing all shifts in the organization
-- This covers both owners (via organization_id check) and all employees
CREATE POLICY "View organization shifts" ON public.shifts
    FOR SELECT USING (
        -- Case 1: user is the organization owner
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = public.shifts.organization_id
            AND o.owner_id = (SELECT auth.uid())
        )
        OR
        -- Case 2: user is an employee in the same organization
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = (SELECT auth.uid())
            AND e.organization_id = public.shifts.organization_id
        )
    );

-- 3. Ensure "Manage org shifts" remains for administrative actions
-- (Already exists from migration 004, but we keep it functionally separate from SELECT)
