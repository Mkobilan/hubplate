-- Sides Migration

-- ============================================
-- SIDES (e.g. Fries, Salad, Mashed Potatoes)
-- ============================================

CREATE TABLE IF NOT EXISTS public.sides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mapping Sides to Menu Items or Categories
CREATE TABLE IF NOT EXISTS public.side_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    side_id UUID REFERENCES public.sides(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (menu_item_id IS NOT NULL AND category_id IS NULL) OR
        (menu_item_id IS NULL AND category_id IS NOT NULL)
    ),
    UNIQUE(side_id, menu_item_id),
    UNIQUE(side_id, category_id)
);

-- ============================================
-- FIX 403 FORBIDDEN FOR ORDERS
-- ============================================

-- Ensure employees, owners, and org owners can INSERT orders at their location
DROP POLICY IF EXISTS "Employees can insert location orders" ON public.orders;
DROP POLICY IF EXISTS "Universal insert for orders" ON public.orders;

CREATE POLICY "Universal insert for orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  location_id IN (
    -- Employees
    SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND is_active = true
    UNION
    -- Direct Location Owners
    SELECT id FROM public.locations WHERE owner_id = auth.uid()
    UNION
    -- Organization Owners
    SELECT l.id 
    FROM public.locations l
    JOIN public.organizations o ON l.organization_id = o.id
    WHERE o.owner_id = auth.uid()
  )
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.sides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.side_assignments ENABLE ROW LEVEL SECURITY;

-- Sides Policies
CREATE POLICY "sides_select_policy" ON public.sides
    FOR SELECT USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "sides_all_policy" ON public.sides
    FOR ALL USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

-- Side Assignments Policies
CREATE POLICY "side_assignments_select_policy" ON public.side_assignments
    FOR SELECT USING (
        side_id IN (SELECT id FROM public.sides)
    );

CREATE POLICY "side_assignments_all_policy" ON public.side_assignments
    FOR ALL USING (
        side_id IN (
            SELECT id FROM public.sides WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid() AND role IN ('manager', 'owner')
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sides_location ON public.sides(location_id);
CREATE INDEX IF NOT EXISTS idx_side_assignments_item ON public.side_assignments(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_side_assignments_category ON public.side_assignments(category_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_sides_updated_at 
    BEFORE UPDATE ON public.sides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
