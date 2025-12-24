-- Migration 007: Clock-in Enhancements
-- Adds break tracking to time_entries

ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS current_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_break_type TEXT;

-- Update RLS policies to allow employees to update their own active time entry for breaks
DROP POLICY IF EXISTS "Update own time entries" ON public.time_entries;
CREATE POLICY "Update own time entries" ON public.time_entries
    FOR UPDATE USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
    WITH CHECK (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );
