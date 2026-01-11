-- 1. Create inventory_storage_areas table
CREATE TABLE IF NOT EXISTS public.inventory_storage_areas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamp WITH time zone DEFAULT now(),
    updated_at timestamp WITH time zone DEFAULT now(),
    UNIQUE(location_id, name)
);

-- 2. Add storage_area columns to inventory_items
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS storage_area_id uuid REFERENCES public.inventory_storage_areas(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS storage_area_name text;

-- 3. Enable RLS
ALTER TABLE public.inventory_storage_areas ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to read inventory_storage_areas" ON public.inventory_storage_areas;
CREATE POLICY "Allow authenticated users to read inventory_storage_areas"
    ON public.inventory_storage_areas FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow managers to insert inventory_storage_areas" ON public.inventory_storage_areas;
CREATE POLICY "Allow managers to insert inventory_storage_areas"
    ON public.inventory_storage_areas FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow managers to update inventory_storage_areas" ON public.inventory_storage_areas;
CREATE POLICY "Allow managers to update inventory_storage_areas"
    ON public.inventory_storage_areas FOR UPDATE
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow managers to delete inventory_storage_areas" ON public.inventory_storage_areas;
CREATE POLICY "Allow managers to delete inventory_storage_areas"
    ON public.inventory_storage_areas FOR DELETE
    USING (auth.role() = 'authenticated');

-- 5. Seed default areas for ALL existing locations (Simplified to avoid DO blocks)
INSERT INTO public.inventory_storage_areas (location_id, name)
SELECT l.id, area_name
FROM public.locations l
CROSS JOIN (
    VALUES 
        ('Dry Storage'),
        ('Walk in Cooler'),
        ('Walk in Freezer'),
        ('Bar'),
        ('Server Station')
) AS defaults(area_name)
ON CONFLICT (location_id, name) DO NOTHING;
