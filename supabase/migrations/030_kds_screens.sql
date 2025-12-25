-- KDS Multi-Screen System Migration
-- Allows restaurants to create multiple KDS screens (Bar, Fryer, Salad, etc.)
-- and assign menu items to specific screens

-- =============================================================================
-- KDS SCREENS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kds_screens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,  -- Main Kitchen screen
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.kds_screens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kds_screens
CREATE POLICY "kds_screens_select_policy" ON public.kds_screens
    FOR SELECT USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "kds_screens_insert_policy" ON public.kds_screens
    FOR INSERT WITH CHECK (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "kds_screens_update_policy" ON public.kds_screens
    FOR UPDATE USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "kds_screens_delete_policy" ON public.kds_screens
    FOR DELETE USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_kds_screens_location ON public.kds_screens(location_id);
CREATE INDEX IF NOT EXISTS idx_kds_screens_display_order ON public.kds_screens(location_id, display_order);

-- =============================================================================
-- MENU ITEM KDS ASSIGNMENTS (Junction Table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.menu_item_kds_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    kds_screen_id UUID REFERENCES public.kds_screens(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(menu_item_id, kds_screen_id)
);

-- Enable RLS
ALTER TABLE public.menu_item_kds_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for menu_item_kds_assignments
CREATE POLICY "menu_item_kds_assignments_select_policy" ON public.menu_item_kds_assignments
    FOR SELECT USING (
        menu_item_id IN (
            SELECT id FROM public.menu_items WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid()
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_item_kds_assignments_insert_policy" ON public.menu_item_kds_assignments
    FOR INSERT WITH CHECK (
        menu_item_id IN (
            SELECT id FROM public.menu_items WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "menu_item_kds_assignments_delete_policy" ON public.menu_item_kds_assignments
    FOR DELETE USING (
        menu_item_id IN (
            SELECT id FROM public.menu_items WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_menu_item_kds_menu_item ON public.menu_item_kds_assignments(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_kds_screen ON public.menu_item_kds_assignments(kds_screen_id);

-- =============================================================================
-- TRIGGER FOR updated_at
-- =============================================================================

CREATE TRIGGER update_kds_screens_updated_at 
    BEFORE UPDATE ON public.kds_screens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
