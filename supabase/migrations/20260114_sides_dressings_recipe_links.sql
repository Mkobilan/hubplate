-- Migration: Sides and Dressings Recipe Links
-- Enables sides and dressings to be linked to recipes for automatic inventory deduction
-- When a side or dressing is ordered, its linked recipe's ingredients will be deducted from running_stock

-- ============================================
-- SIDE RECIPE LINKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.side_recipe_links (
    side_id UUID REFERENCES public.sides(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (side_id, recipe_id)
);

ALTER TABLE public.side_recipe_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "side_recipe_links_select_policy" ON public.side_recipe_links;
CREATE POLICY "side_recipe_links_select_policy" ON public.side_recipe_links
    FOR SELECT USING (
        side_id IN (SELECT id FROM public.sides)
    );

DROP POLICY IF EXISTS "side_recipe_links_all_policy" ON public.side_recipe_links; -- Cleanup old policy
DROP POLICY IF EXISTS "side_recipe_links_insert_policy" ON public.side_recipe_links;
CREATE POLICY "side_recipe_links_insert_policy" ON public.side_recipe_links
    FOR INSERT WITH CHECK (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "side_recipe_links_update_policy" ON public.side_recipe_links;
CREATE POLICY "side_recipe_links_update_policy" ON public.side_recipe_links
    FOR UPDATE USING (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    ) WITH CHECK (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "side_recipe_links_delete_policy" ON public.side_recipe_links;
CREATE POLICY "side_recipe_links_delete_policy" ON public.side_recipe_links
    FOR DELETE USING (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

CREATE INDEX IF NOT EXISTS idx_side_recipe_links_side ON public.side_recipe_links(side_id);
CREATE INDEX IF NOT EXISTS idx_side_recipe_links_recipe ON public.side_recipe_links(recipe_id);

-- ============================================
-- DRESSING RECIPE LINKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.dressing_recipe_links (
    dressing_id UUID REFERENCES public.dressings(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (dressing_id, recipe_id)
);

ALTER TABLE public.dressing_recipe_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dressing_recipe_links_select_policy" ON public.dressing_recipe_links;
CREATE POLICY "dressing_recipe_links_select_policy" ON public.dressing_recipe_links
    FOR SELECT USING (
        dressing_id IN (SELECT id FROM public.dressings)
    );

DROP POLICY IF EXISTS "dressing_recipe_links_all_policy" ON public.dressing_recipe_links; -- Cleanup old policy
DROP POLICY IF EXISTS "dressing_recipe_links_insert_policy" ON public.dressing_recipe_links;
CREATE POLICY "dressing_recipe_links_insert_policy" ON public.dressing_recipe_links
    FOR INSERT WITH CHECK (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "dressing_recipe_links_update_policy" ON public.dressing_recipe_links;
CREATE POLICY "dressing_recipe_links_update_policy" ON public.dressing_recipe_links
    FOR UPDATE USING (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    ) WITH CHECK (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "dressing_recipe_links_delete_policy" ON public.dressing_recipe_links;
CREATE POLICY "dressing_recipe_links_delete_policy" ON public.dressing_recipe_links
    FOR DELETE USING (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = (select auth.uid()) 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
            )
        )
    );

CREATE INDEX IF NOT EXISTS idx_dressing_recipe_links_dressing ON public.dressing_recipe_links(dressing_id);
CREATE INDEX IF NOT EXISTS idx_dressing_recipe_links_recipe ON public.dressing_recipe_links(recipe_id);

-- ============================================
-- ADD COLUMNS TO POURS TABLE
-- ============================================

ALTER TABLE public.pours ADD COLUMN IF NOT EXISTS side_id UUID REFERENCES public.sides(id) ON DELETE SET NULL;
ALTER TABLE public.pours ADD COLUMN IF NOT EXISTS side_name TEXT;
ALTER TABLE public.pours ADD COLUMN IF NOT EXISTS dressing_id UUID REFERENCES public.dressings(id) ON DELETE SET NULL;
ALTER TABLE public.pours ADD COLUMN IF NOT EXISTS dressing_name TEXT;

CREATE INDEX IF NOT EXISTS idx_pours_side ON public.pours(side_id);
CREATE INDEX IF NOT EXISTS idx_pours_dressing ON public.pours(dressing_id);
