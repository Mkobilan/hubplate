-- Add Ons and Upsells Migration

-- ============================================
-- ADD ONS (Modifiers with prices)
-- ============================================

CREATE TABLE IF NOT EXISTS public.add_ons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping Add Ons to Menu Categories
CREATE TABLE IF NOT EXISTS public.add_on_category_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    add_on_id UUID REFERENCES public.add_ons(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(add_on_id, category_id)
);

-- ============================================
-- UPSELLS (Suggestions to offer)
-- ============================================

CREATE TABLE IF NOT EXISTS public.upsells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping Upsells to Menu Items or Categories
CREATE TABLE IF NOT EXISTS public.upsell_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upsell_id UUID REFERENCES public.upsells(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (menu_item_id IS NOT NULL AND category_id IS NULL) OR
        (menu_item_id IS NULL AND category_id IS NOT NULL)
    )
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_on_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_assignments ENABLE ROW LEVEL SECURITY;

-- Add Ons Policies
CREATE POLICY "add_ons_select_policy" ON public.add_ons
    FOR SELECT USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "add_ons_all_policy" ON public.add_ons
    FOR ALL USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

-- Add On Category Assignments Policies
CREATE POLICY "add_on_assignments_select_policy" ON public.add_on_category_assignments
    FOR SELECT USING (
        add_on_id IN (SELECT id FROM public.add_ons)
    );

CREATE POLICY "add_on_assignments_all_policy" ON public.add_on_category_assignments
    FOR ALL USING (
        add_on_id IN (
            SELECT id FROM public.add_ons WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

-- Upsells Policies
CREATE POLICY "upsells_select_policy" ON public.upsells
    FOR SELECT USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "upsells_all_policy" ON public.upsells
    FOR ALL USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

-- Upsell Assignments Policies
CREATE POLICY "upsell_assignments_select_policy" ON public.upsell_assignments
    FOR SELECT USING (
        upsell_id IN (SELECT id FROM public.upsells)
    );

CREATE POLICY "upsell_assignments_all_policy" ON public.upsell_assignments
    FOR ALL USING (
        upsell_id IN (
            SELECT id FROM public.upsells WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_add_ons_location ON public.add_ons(location_id);
CREATE INDEX IF NOT EXISTS idx_upsells_location ON public.upsells(location_id);
CREATE INDEX IF NOT EXISTS idx_upsell_assignments_item ON public.upsell_assignments(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_upsell_assignments_category ON public.upsell_assignments(category_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_add_ons_updated_at 
    BEFORE UPDATE ON public.add_ons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upsells_updated_at 
    BEFORE UPDATE ON public.upsells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
