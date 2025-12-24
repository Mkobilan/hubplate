-- Migration 029: Smart-Column Comp Support
-- This moves all comping logic to a single JSONB column on the 'orders' table 
-- to avoid modifying the POS-specific 'order_items' table.

-- 1. Ensure order_items is clean (No comp data here)
ALTER TABLE public.order_items DROP COLUMN IF EXISTS is_comped;
ALTER TABLE public.order_items DROP COLUMN IF EXISTS comp_reason;

-- 2. Setup Order-Level support
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_comped BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS comp_reason TEXT;

-- 3. Setup Per-Item support via JSONB Smart Column
-- Structure: {"comped_items": {"item_id": "reason", "item_id_2": "reason"}}
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS comp_meta JSONB DEFAULT '{}'::jsonb;

-- 4. Update Permissions (Ensuring full manager access)
DROP POLICY IF EXISTS "Org access for orders" ON public.orders;
CREATE POLICY "Org access for orders" ON public.orders
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations 
            WHERE organization_id IN (SELECT orgid FROM get_my_organizations())
        )
    );
