-- Fix RLS policies for scheduling system
-- Allows organization owners (from organizations table) to manage scheduling items
-- even if they don't have an explicit record in the employees table.

-- =============================================================================
-- STAFFING TEMPLATES RLS FIX
-- =============================================================================

DROP POLICY IF EXISTS "Manage org staffing_templates" ON public.staffing_templates;

CREATE POLICY "Manage org staffing_templates" ON public.staffing_templates
FOR ALL USING (
    -- Case 1: Is the Organization Owner
    EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = public.staffing_templates.organization_id
        AND o.owner_id = (SELECT auth.uid())
    )
    OR
    -- Case 2: Is an employee with manager/owner role
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = (SELECT auth.uid())
        AND e.role IN ('owner', 'manager')
        AND e.organization_id = public.staffing_templates.organization_id
    )
);

-- =============================================================================
-- STAFFING RULES RLS FIX
-- =============================================================================

DROP POLICY IF EXISTS "Manage staffing_rules via template" ON public.staffing_rules;

CREATE POLICY "Manage staffing_rules via template" ON public.staffing_rules
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.staffing_templates st
        WHERE st.id = public.staffing_rules.template_id
        AND (
            -- Case 1: Is the Organization Owner
            EXISTS (
                SELECT 1 FROM public.organizations o
                WHERE o.id = st.organization_id
                AND o.owner_id = (SELECT auth.uid())
            )
            OR
            -- Case 2: Is an employee with manager/owner role
            EXISTS (
                SELECT 1 FROM public.employees e
                WHERE e.user_id = (SELECT auth.uid())
                AND e.role IN ('owner', 'manager')
                AND e.organization_id = st.organization_id
            )
        )
    )
);

-- =============================================================================
-- SCHEDULE BATCHES RLS FIX
-- =============================================================================

DROP POLICY IF EXISTS "Manage org schedule_batches" ON public.schedule_batches;

CREATE POLICY "Manage org schedule_batches" ON public.schedule_batches
FOR ALL USING (
    -- Case 1: Is the Organization Owner
    EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = public.schedule_batches.organization_id
        AND o.owner_id = (SELECT auth.uid())
    )
    OR
    -- Case 2: Is an employee with manager/owner role
    EXISTS (
        SELECT 1 FROM public.employees e
        WHERE e.user_id = (SELECT auth.uid())
        AND e.role IN ('owner', 'manager')
        AND e.organization_id = public.schedule_batches.organization_id
    )
);
