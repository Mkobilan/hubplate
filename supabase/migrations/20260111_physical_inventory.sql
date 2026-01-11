-- Migration: Create Physical Inventory Tables
-- Records snapshots of inventory counts for variance analysis

-- 1. Create sessions table
CREATE TABLE IF NOT EXISTS public.physical_inventory_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    storage_area_id uuid REFERENCES public.inventory_storage_areas(id) ON DELETE SET NULL,
    recorded_by uuid REFERENCES auth.users(id),
    status text DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
    created_at timestamp WITH time zone DEFAULT now(),
    updated_at timestamp WITH time zone DEFAULT now()
);

-- 2. Create counts table
CREATE TABLE IF NOT EXISTS public.physical_inventory_counts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES public.physical_inventory_sessions(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    recorded_quantity DECIMAL(15,4) NOT NULL, -- Quantity in Stock Units (e.g. 5 cases)
    theoretical_quantity DECIMAL(15,4), -- Snapshot of running_stock (atomic units like oz)
    conversion_at_recording DECIMAL(15,4) DEFAULT 1.0, -- Multiplier to get from Stock Unit to Atomic
    variance_atomic DECIMAL(15,4), -- (recorded_quantity * conversion_at_recording) - theoretical_quantity
    created_at timestamp WITH time zone DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.physical_inventory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_inventory_counts ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DROP POLICY IF EXISTS "Allow authenticated users to read sessions" ON public.physical_inventory_sessions;
CREATE POLICY "Allow authenticated users to read sessions"
    ON public.physical_inventory_sessions FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert sessions" ON public.physical_inventory_sessions;
CREATE POLICY "Allow authenticated users to insert sessions"
    ON public.physical_inventory_sessions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to read counts" ON public.physical_inventory_counts;
CREATE POLICY "Allow authenticated users to read counts"
    ON public.physical_inventory_counts FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to insert counts" ON public.physical_inventory_counts;
CREATE POLICY "Allow authenticated users to insert counts"
    ON public.physical_inventory_counts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
