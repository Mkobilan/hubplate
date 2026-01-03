-- Migration: Payroll Feature
-- Description: Adds tables for payroll periods, payroll runs, and tip pooling.

-- 1. Payroll Periods
CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_period_per_location UNIQUE (location_id, start_date, end_date)
);

-- 2. Payroll Runs (Individual Employee Summary)
CREATE TABLE IF NOT EXISTS public.payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    regular_hours DECIMAL(10,2) DEFAULT 0,
    overtime_hours DECIMAL(10,2) DEFAULT 0,
    gross_regular_pay DECIMAL(10,2) DEFAULT 0,
    gross_overtime_pay DECIMAL(10,2) DEFAULT 0,
    tips_earned DECIMAL(10,2) DEFAULT 0,
    deductions_total DECIMAL(10,2) DEFAULT 0,
    net_pay_estimated DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store breakdown: { "base_rate": 20, "ot_rate": 30, "total_orders": 15 }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(period_id, employee_id)
);

-- 3. Tip Pools (Configuration for how tips are split)
CREATE TABLE IF NOT EXISTS public.tip_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    contribution_rules JSONB DEFAULT '[]'::jsonb, -- e.g., [{"role": "server", "type": "percentage_of_sales", "value": 3}]
    distribution_rules JSONB DEFAULT '[]'::jsonb, -- e.g., [{"role": "busser", "type": "percentage_of_pool", "value": 10}]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_pools ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Managers and Owners only for payroll)
DROP POLICY IF EXISTS "Managers can manage payroll periods" ON public.payroll_periods;
CREATE POLICY "Managers can manage payroll periods" ON public.payroll_periods
    FOR ALL TO authenticated USING (
        public.check_is_manager(organization_id)
    );

-- Consolidated SELECT policy for payroll runs (Performance & Security)
DROP POLICY IF EXISTS "Managers can manage payroll runs" ON public.payroll_runs;
DROP POLICY IF EXISTS "Employees can view own payroll runs" ON public.payroll_runs;

CREATE POLICY "payroll_runs_select" ON public.payroll_runs
    FOR SELECT TO authenticated USING (
        employee_id IN (SELECT id FROM public.employees WHERE user_id = (select auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.payroll_periods pp
            WHERE pp.id = public.payroll_runs.period_id
            AND public.check_is_manager(pp.organization_id)
        )
    );

-- Separate policies for management (INSERT, UPDATE, DELETE)
CREATE POLICY "payroll_runs_insert" ON public.payroll_runs
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.payroll_periods pp
            WHERE pp.id = public.payroll_runs.period_id
            AND public.check_is_manager(pp.organization_id)
        )
    );

CREATE POLICY "payroll_runs_update" ON public.payroll_runs
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.payroll_periods pp
            WHERE pp.id = public.payroll_runs.period_id
            AND public.check_is_manager(pp.organization_id)
        )
    );

CREATE POLICY "payroll_runs_delete" ON public.payroll_runs
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.payroll_periods pp
            WHERE pp.id = public.payroll_runs.period_id
            AND public.check_is_manager(pp.organization_id)
        )
    );

DROP POLICY IF EXISTS "Managers can manage tip pools" ON public.tip_pools;
CREATE POLICY "Managers can manage tip pools" ON public.tip_pools
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.locations l
            WHERE l.id = public.tip_pools.location_id
            AND public.check_is_manager(l.organization_id)
        )
    );

-- 6. Trigger for updated_at
CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tip_pools_updated_at BEFORE UPDATE ON public.tip_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
