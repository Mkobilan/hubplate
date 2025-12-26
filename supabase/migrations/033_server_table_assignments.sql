-- Migration 033: Server Table Assignments
-- Adds support for assigning servers to tables with color coding and initials.

-- 1. Add server_color to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS server_color TEXT DEFAULT '#334155';

-- 2. Add assigned_server_id to seating_tables
ALTER TABLE public.seating_tables ADD COLUMN IF NOT EXISTS assigned_server_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- 3. Update RLS policies for seating_tables to allow managers to update assignments
-- (Existing policies already allow Managers/Owners to manage seating tables, but let's be explicit if needed)

-- Already exists in 032_seat_maps.sql:
-- create policy "Managers and Owners can manage seating tables"
--     on public.seating_tables for all
--     using ( ... check for manager role or org owner ... )

-- Ensure employees can update their own server_color
CREATE POLICY "Employees can update their own server_color" ON public.employees
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Note: The "Managers and Owners can manage seating tables" policy already covers 
-- the update of assigned_server_id by management.
