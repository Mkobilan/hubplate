-- Migration: Add Dressings and Consolidate Add-ons/Upsells
-- Description: Adds dressings tables and moves all add-on/upsell assignments to a flexible table.

-- 1. DRESSINGS
CREATE TABLE IF NOT EXISTS public.dressings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dressing_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dressing_id UUID REFERENCES public.dressings(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (menu_item_id IS NOT NULL AND category_id IS NULL) OR
        (menu_item_id IS NULL AND category_id IS NOT NULL)
    )
);

-- 2. FLEXIBLE ADD-ON ASSIGNMENTS (Consolidation)
CREATE TABLE IF NOT EXISTS public.add_on_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    add_on_id UUID REFERENCES public.add_ons(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (
        (menu_item_id IS NOT NULL AND category_id IS NULL) OR
        (menu_item_id IS NULL AND category_id IS NOT NULL)
    ),
    UNIQUE(add_on_id, menu_item_id, category_id)
);

-- 3. MIGRATE DATA
-- Migrate category-only assignments
INSERT INTO public.add_on_assignments (add_on_id, category_id)
SELECT add_on_id, category_id FROM public.add_on_category_assignments
ON CONFLICT DO NOTHING;

-- Migrate Upsells to Add-ons table and recreate assignments
DO $$
DECLARE
    u_row RECORD;
    new_ao_id UUID;
    ass_row RECORD;
BEGIN
    FOR u_row IN SELECT * FROM public.upsells LOOP
        -- Check if an add-on with the same name already exists for this location
        SELECT id INTO new_ao_id FROM public.add_ons WHERE location_id = u_row.location_id AND name = u_row.name LIMIT 1;
        
        IF new_ao_id IS NULL THEN
            INSERT INTO public.add_ons (location_id, name, price, is_active, created_at, updated_at)
            VALUES (u_row.location_id, u_row.name, u_row.price, u_row.is_active, u_row.created_at, u_row.updated_at)
            RETURNING id INTO new_ao_id;
        END IF;

        -- Migrate assignments for this upsell
        FOR ass_row IN SELECT * FROM public.upsell_assignments WHERE upsell_id = u_row.id LOOP
            INSERT INTO public.add_on_assignments (add_on_id, menu_item_id, category_id)
            VALUES (new_ao_id, ass_row.menu_item_id, ass_row.category_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 4. RLS POLICIES
ALTER TABLE public.dressings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dressing_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_on_assignments ENABLE ROW LEVEL SECURITY;

-- Dressings
CREATE POLICY "dressings_select_policy" ON public.dressings
    FOR SELECT USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid()
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "dressings_all_policy" ON public.dressings
    FOR ALL USING (
        location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = auth.uid() 
            AND role IN ('manager', 'owner', 'gm', 'agm')
            UNION
            SELECT id FROM public.locations WHERE owner_id = auth.uid()
        )
    );

-- Dressing Assignments
CREATE POLICY "dressing_assignments_select_policy" ON public.dressing_assignments
    FOR SELECT USING (
        dressing_id IN (SELECT id FROM public.dressings)
    );

CREATE POLICY "dressing_assignments_all_policy" ON public.dressing_assignments
    FOR ALL USING (
        dressing_id IN (
            SELECT id FROM public.dressings WHERE location_id IN (
                SELECT location_id FROM public.employees WHERE user_id = auth.uid() 
                AND role IN ('manager', 'owner', 'gm', 'agm')
                UNION
                SELECT id FROM public.locations WHERE owner_id = auth.uid()
            )
        )
    );

-- Add On Assignments
CREATE POLICY "add_on_assignments_select_policy" ON public.add_on_assignments
    FOR SELECT USING (
        add_on_id IN (SELECT id FROM public.add_ons)
    );

CREATE POLICY "add_on_assignments_all_policy" ON public.add_on_assignments
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

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_dressings_location ON public.dressings(location_id);
CREATE INDEX IF NOT EXISTS idx_dressing_assignments_item ON public.dressing_assignments(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_dressing_assignments_category ON public.dressing_assignments(category_id);
CREATE INDEX IF NOT EXISTS idx_add_on_assignments_item ON public.add_on_assignments(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_add_on_assignments_category ON public.add_on_assignments(category_id);

-- 6. TRIGGERS
CREATE TRIGGER update_dressings_updated_at 
    BEFORE UPDATE ON public.dressings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
