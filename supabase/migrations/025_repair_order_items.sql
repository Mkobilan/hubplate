-- Migration 025: Fix Order Items RLS and Add Comp Reason
-- This ensures managers and owners can update order items (like for comping)
-- and adds a field to record why an item was comped.

-- 1. Add comp_reason to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS comp_reason TEXT;

-- 2. Repair RLS for order_items to be organization-aware
-- Existing policies might be pointing to old restaurant structure or be missing updates
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Org access for order_items" ON public.order_items;

CREATE POLICY "Org access for order_items" ON public.order_items
    FOR ALL USING (
        order_id IN (
            SELECT id FROM public.orders 
            WHERE location_id IN (
                SELECT id FROM public.locations 
                WHERE organization_id IN (SELECT org_id FROM public.get_my_organizations())
            )
        )
    );

-- Also ensure RLS is definitely enabled
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
