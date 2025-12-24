-- Migration 028: Cleanup and Order-Level Enforcement
-- Removes the experimental columns from order_items and ensures orders has them.

-- 1. Remove columns from order_items (Strictly Order-Level only)
ALTER TABLE public.order_items DROP COLUMN IF EXISTS is_comped;
ALTER TABLE public.order_items DROP COLUMN IF EXISTS comp_reason;

-- 2. Ensure columns exist on orders (Migration 026 should have done this, but we verify)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_comped BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS comp_reason TEXT;

-- 3. Ensure RLS is correct for managers
DROP POLICY IF EXISTS "Org access for orders" ON public.orders;

CREATE POLICY "Org access for orders" ON public.orders
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations 
            WHERE organization_id IN (SELECT orgid FROM get_my_organizations())
        )
    );
