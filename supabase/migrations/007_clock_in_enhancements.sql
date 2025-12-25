-- Migration 007: Clock-in Enhancements
-- Adds break tracking to time_entries

ALTER TABLE public.time_entries 
ADD COLUMN IF NOT EXISTS current_break_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_break_type TEXT;

-- Policy logic moved to 004_staff_enhancements.sql to centralize and avoid overlaps.
DROP POLICY IF EXISTS "Update own time entries" ON public.time_entries;
