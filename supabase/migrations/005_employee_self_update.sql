-- Migration 005: Employee Self-Update
-- Allows employees to update their own profile information (email, phone, etc.)

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;

-- Policy to allow employees to update their own record
-- Note: In a production app, you might want to restrict which columns can be updated via a trigger or more specific checks,
-- but for now, we'll allow updates where the user_id matches.
DROP POLICY IF EXISTS "Employees can update own info" ON public.employees;
CREATE POLICY "Employees can update own info" ON public.employees
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Ensure they can also view themselves (already handled in 003, but being explicit doesn't hurt)
DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
CREATE POLICY "Employees can view own record" ON public.employees
    FOR SELECT USING (user_id = auth.uid());
