-- Migration: Repair Payroll RLS and Type Issues
-- Description: Standardizes roles and simplifies RLS using existing check_is_manager function.

-- 1. Update RLS for Payroll Periods (Simplify)
DROP POLICY IF EXISTS "Managers can manage payroll periods" ON public.payroll_periods;
CREATE POLICY "Managers can manage payroll periods" ON public.payroll_periods
    FOR ALL USING (
        -- organization_id exists on this table
        public.check_is_manager(organization_id)
    );

-- 2. Update RLS for Payroll Runs (Simplify & Fix 403)
DROP POLICY IF EXISTS "Managers can manage payroll runs" ON public.payroll_runs;
CREATE POLICY "Managers can manage payroll runs" ON public.payroll_runs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.payroll_periods pp
            WHERE pp.id = public.payroll_runs.period_id
            AND public.check_is_manager(pp.organization_id)
        )
    );

-- 3. Update RLS for Tip Pools (Simplify)
DROP POLICY IF EXISTS "Managers can manage tip pools" ON public.tip_pools;
CREATE POLICY "Managers can manage tip pools" ON public.tip_pools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.locations l
            WHERE l.id = public.tip_pools.location_id
            AND public.check_is_manager(l.organization_id)
        )
    );

-- 4. Ensure Employees can still view their own runs
DROP POLICY IF EXISTS "Employees can view own payroll runs" ON public.payroll_runs;
CREATE POLICY "Employees can view own payroll runs" ON public.payroll_runs
    FOR SELECT USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
    );
