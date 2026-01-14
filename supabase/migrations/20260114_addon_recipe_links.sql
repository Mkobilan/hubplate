-- Migration: Add-on Recipe Links
-- Enables add-ons to be linked to recipes for automatic inventory deduction
-- When an add-on is ordered, its linked recipe's ingredients will be deducted from running_stock

-- 1. Create junction table for add-on to recipe relationships
CREATE TABLE IF NOT EXISTS public.add_on_recipe_links (
    add_on_id UUID REFERENCES public.add_ons(id) ON DELETE CASCADE NOT NULL,
    recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (add_on_id, recipe_id)
);

-- 2. Enable RLS
ALTER TABLE public.add_on_recipe_links ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Select: Anyone who can view add-ons can view their recipe links
CREATE POLICY "add_on_recipe_links_select_policy" ON public.add_on_recipe_links
    FOR SELECT USING (
        add_on_id IN (SELECT id FROM public.add_ons)
    );

-- All operations: Management can manage links
CREATE POLICY "add_on_recipe_links_all_policy" ON public.add_on_recipe_links
    FOR ALL USING (
        add_on_id IN (
            SELECT id FROM public.add_ons WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid() 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_add_on_recipe_links_addon ON public.add_on_recipe_links(add_on_id);
CREATE INDEX IF NOT EXISTS idx_add_on_recipe_links_recipe ON public.add_on_recipe_links(recipe_id);

-- 5. Add columns to pours table for tracking add-on usage (if not exists)
ALTER TABLE public.pours ADD COLUMN IF NOT EXISTS add_on_id UUID REFERENCES public.add_ons(id) ON DELETE SET NULL;
ALTER TABLE public.pours ADD COLUMN IF NOT EXISTS add_on_name TEXT;

-- 6. Index for add_on_id lookups on pours
CREATE INDEX IF NOT EXISTS idx_pours_add_on ON public.pours(add_on_id);
