-- Migration 027: Dual-Level Comp Support
-- Restores item-level comping while maintaining the order-level comping added in 026.

-- 1. Restore columns to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS is_comped BOOLEAN DEFAULT FALSE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS comp_reason TEXT;

-- 2. Ensure RLS for order_items allows updates (Managers/Owners)
DROP POLICY IF EXISTS "Org access for order_items" ON public.order_items;

CREATE POLICY "Org access for order_items" ON public.order_items
    FOR ALL USING (
        order_id IN (
            SELECT o.id FROM public.orders o
            JOIN public.locations l ON o.location_id = l.id
            WHERE l.organization_id IN (SELECT orgid FROM get_my_organizations())
        )
    );
