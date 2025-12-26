-- Fix RLS for Shift Swap Requests to support Terminal/Owner mode
-- The previous policy only allowed insertion if the requester_id matched the auth.uid user_id.
-- In Terminal mode, an Owner (auth.uid) creates requests on behalf of an Employee (requester_id via PIN).

DROP POLICY IF EXISTS "Create shift swap requests" ON public.shift_swap_requests;

CREATE POLICY "Create shift swap requests" ON public.shift_swap_requests
    FOR INSERT TO authenticated WITH CHECK (
        -- User is the employee requesting
        requester_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
        OR
        -- User is an owner/manager of the organization (Terminal mode)
        organization_id IN (SELECT org_id FROM get_my_organizations())
    );
