-- Scheduling System Enhancement
-- Adds tables for staffing templates and rules, plus max_weekly_hours on employees

-- =============================================================================
-- EMPLOYEE ENHANCEMENTS
-- =============================================================================

-- Add max_weekly_hours to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS max_weekly_hours DECIMAL(5,2) DEFAULT 40;

-- Add secondary_roles for employees who can work multiple roles
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS secondary_roles TEXT[] DEFAULT '{}';

-- =============================================================================
-- STAFFING TEMPLATES
-- =============================================================================

-- Staffing Templates - reusable templates for typical staffing patterns
CREATE TABLE IF NOT EXISTS public.staffing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.staffing_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staffing_templates
CREATE POLICY "Manage org staffing_templates" ON public.staffing_templates
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = (SELECT auth.uid())
        AND e.role IN ('owner', 'manager')
        AND e.organization_id = public.staffing_templates.organization_id
    )
);

-- =============================================================================
-- STAFFING RULES
-- =============================================================================

-- Staffing Rules - define time-based staffing requirements per role
CREATE TABLE IF NOT EXISTS public.staffing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.staffing_templates(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    min_staff INTEGER NOT NULL DEFAULT 1,
    day_of_week INTEGER, -- 0-6 for specific days, NULL for all days
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.staffing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for staffing_rules
CREATE POLICY "Manage staffing_rules via template" ON public.staffing_rules
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.staffing_templates st
        JOIN public.employees e ON e.organization_id = st.organization_id
        WHERE st.id = public.staffing_rules.template_id
        AND e.user_id = (SELECT auth.uid())
        AND e.role IN ('owner', 'manager')
    )
);

-- =============================================================================
-- GENERATED SCHEDULES
-- =============================================================================

-- Track generated schedule batches for approval workflow
CREATE TABLE IF NOT EXISTS public.schedule_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.staffing_templates(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'published')),
    created_by UUID REFERENCES public.employees(id),
    approved_by UUID REFERENCES public.employees(id),
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    notes TEXT,
    overtime_warnings JSONB DEFAULT '[]',
    coverage_gaps JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.schedule_batches ENABLE ROW LEVEL SECURITY;

-- Add batch_id to shifts table to link shifts to a schedule batch
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.schedule_batches(id) ON DELETE SET NULL;

-- RLS Policies for schedule_batches
CREATE POLICY "Manage org schedule_batches" ON public.schedule_batches
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = (SELECT auth.uid())
        AND e.role IN ('owner', 'manager')
        AND e.organization_id = public.schedule_batches.organization_id
    )
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_staffing_templates_location ON public.staffing_templates(location_id);
CREATE INDEX IF NOT EXISTS idx_staffing_templates_org ON public.staffing_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_staffing_rules_template ON public.staffing_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_location ON public.schedule_batches(location_id);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_dates ON public.schedule_batches(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_shifts_batch ON public.shifts(batch_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_staffing_templates_updated_at BEFORE UPDATE ON public.staffing_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_batches_updated_at BEFORE UPDATE ON public.schedule_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
