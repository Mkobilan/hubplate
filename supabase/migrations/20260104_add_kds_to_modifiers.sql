-- Add KDS Mapping for Sides and Dressings
-- Migration: 20260104_add_kds_to_modifiers.sql

-- =============================================================================
-- SIDE KDS ASSIGNMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.side_kds_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    side_id UUID REFERENCES public.sides(id) ON DELETE CASCADE,
    kds_screen_id UUID REFERENCES public.kds_screens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(side_id, kds_screen_id)
);

-- Enable RLS
ALTER TABLE public.side_kds_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for side_kds_assignments
CREATE POLICY "side_kds_assignments_select_policy" ON public.side_kds_assignments
    FOR SELECT USING (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT (SELECT location_id FROM public.employees WHERE user_id = auth.uid())
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
                UNION
                SELECT l.id FROM public.locations l JOIN public.organizations o ON l.owner_id = o.owner_id WHERE o.owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "side_kds_assignments_insert_policy" ON public.side_kds_assignments
    FOR INSERT WITH CHECK (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT (SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner'))
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
                UNION
                SELECT l.id FROM public.locations l JOIN public.organizations o ON l.owner_id = o.owner_id WHERE o.owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "side_kds_assignments_delete_policy" ON public.side_kds_assignments
    FOR DELETE USING (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT (SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner'))
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
                UNION
                SELECT l.id FROM public.locations l JOIN public.organizations o ON l.owner_id = o.owner_id WHERE o.owner_id = auth.uid()
            )
        )
    );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_side_kds_side ON public.side_kds_assignments(side_id);
CREATE INDEX IF NOT EXISTS idx_side_kds_screen ON public.side_kds_assignments(kds_screen_id);

-- =============================================================================
-- DRESSING KDS ASSIGNMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dressing_kds_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dressing_id UUID REFERENCES public.dressings(id) ON DELETE CASCADE,
    kds_screen_id UUID REFERENCES public.kds_screens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dressing_id, kds_screen_id)
);

-- Enable RLS
ALTER TABLE public.dressing_kds_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dressing_kds_assignments
CREATE POLICY "dressing_kds_assignments_select_policy" ON public.dressing_kds_assignments
    FOR SELECT USING (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT (SELECT location_id FROM public.employees WHERE user_id = auth.uid())
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
                UNION
                SELECT l.id FROM public.locations l JOIN public.organizations o ON l.owner_id = o.owner_id WHERE o.owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "dressing_kds_assignments_insert_policy" ON public.dressing_kds_assignments
    FOR INSERT WITH CHECK (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT (SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner'))
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
                UNION
                SELECT l.id FROM public.locations l JOIN public.organizations o ON l.owner_id = o.owner_id WHERE o.owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "dressing_kds_assignments_delete_policy" ON public.dressing_kds_assignments
    FOR DELETE USING (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT (SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner'))
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
                UNION
                SELECT l.id FROM public.locations l JOIN public.organizations o ON l.owner_id = o.owner_id WHERE o.owner_id = auth.uid()
            )
        )
    );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dressing_kds_dressing ON public.dressing_kds_assignments(dressing_id);
CREATE INDEX IF NOT EXISTS idx_dressing_kds_screen ON public.dressing_kds_assignments(kds_screen_id);
