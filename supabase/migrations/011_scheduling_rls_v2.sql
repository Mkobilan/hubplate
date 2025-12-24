-- Migration 011: Robust Scheduling RLS v2
-- This replaces the previous RLS attempts with a centralized check function
-- to ensure organization owners and managers have consistent access.

-- 1. Create a management check function (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.check_is_manager(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        -- Is the Organization Owner?
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = target_org_id AND owner_id = auth.uid()
        )
        OR
        -- Is an employee with manager/owner role?
        EXISTS (
            SELECT 1 FROM public.employees 
            WHERE user_id = auth.uid() 
            AND organization_id = target_org_id 
            AND role IN ('owner', 'manager')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update staffing_templates policies
DROP POLICY IF EXISTS "Manage org staffing_templates" ON public.staffing_templates;
CREATE POLICY "Manage org staffing_templates" ON public.staffing_templates
FOR ALL USING (public.check_is_manager(organization_id));

-- 3. Update staffing_rules policies (relies on template access)
DROP POLICY IF EXISTS "Manage staffing_rules via template" ON public.staffing_rules;
CREATE POLICY "Manage staffing_rules via template" ON public.staffing_rules
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.staffing_templates st
        WHERE st.id = public.staffing_rules.template_id
        AND public.check_is_manager(st.organization_id)
    )
);

-- 4. Update schedule_batches policies
DROP POLICY IF EXISTS "Manage org schedule_batches" ON public.schedule_batches;
CREATE POLICY "Manage org schedule_batches" ON public.schedule_batches
FOR ALL USING (public.check_is_manager(organization_id));
