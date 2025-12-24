-- Migration 026: Order-Level Comp Support
-- This moves comp tracking from individual items to the entire order.

-- 1. Clean up unused columns from order_items (if they exist)
ALTER TABLE public.order_items DROP COLUMN IF EXISTS is_comped;
ALTER TABLE public.order_items DROP COLUMN IF EXISTS comp_reason;

-- 2. Add comp tracking to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_comped BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS comp_reason TEXT;

-- 3. Ensure RLS for orders allows managers to update
-- (Replacing existing policy if necessary or adding a specific update policy)
DROP POLICY IF EXISTS "Org access for orders" ON public.orders;

CREATE POLICY "Org access for orders" ON public.orders
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations 
            WHERE organization_id IN (SELECT orgid FROM get_my_organizations())
        )
    );
