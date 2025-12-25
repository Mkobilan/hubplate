-- Migration 005: Employee Self-Update
-- Allows employees to update their own profile information (email, phone, etc.)

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;

-- Policy to allow employees to update and view their own record
-- (Excluding owners who are already covered by "Manage employees" in 003)
-- Policy logic moved to 003_organizations.sql to centralize and avoid overlaps.
-- This migration now only ensures old versions are removed.
DROP POLICY IF EXISTS "Employees can update own info" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
DROP POLICY IF EXISTS "Self employee access" ON public.employees;
DROP POLICY IF EXISTS "Employee select" ON public.employees;
DROP POLICY IF EXISTS "Employee insert" ON public.employees;
DROP POLICY IF EXISTS "Employee update" ON public.employees;
DROP POLICY IF EXISTS "Employee delete" ON public.employees;
