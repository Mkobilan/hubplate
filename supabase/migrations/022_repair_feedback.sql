-- Update RLS policies for customer_feedback to allow both Owners AND Employees
-- This ensures that staff can view feedback in the dashboard.

DO $$ 
BEGIN
    -- Drop the existing policy if it exists to avoid conflicts
    -- The previous name was "Location access for customer_feedback" in 020_add_loyalty_policies.sql
    DROP POLICY IF EXISTS "Location access for customer_feedback" ON public.customer_feedback;
    -- Drop "Location-based access" if it exists from earlier schemas
    DROP POLICY IF EXISTS "Location access for feedback" ON public.customer_feedback;
END $$;

-- Create the updated policy
CREATE POLICY "Customer feedback access" ON public.customer_feedback
    FOR ALL USING (
        location_id IN (SELECT id FROM public.locations WHERE owner_id = auth.uid()) OR
        location_id IN (SELECT location_id FROM public.employees WHERE user_id = auth.uid())
    );
