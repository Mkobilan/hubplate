-- Migration: Debug KDS Open Access
-- Description: Temporarily removes complex RLS and allows any authenticated user to VIEW orders.
-- This is to confirm if the previous RLS complexity was the cause of Realtime failures.

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Universal access for orders" ON public.orders;
DROP POLICY IF EXISTS "Org access for orders" ON public.orders;
DROP POLICY IF EXISTS "Employees can view location orders" ON public.orders;

-- 2. Create Simple Open Policy
CREATE POLICY "Debug Open Access" ON public.orders
FOR SELECT TO authenticated
USING (true);

-- 3. Keep UPDATE/DELETE strict (we only need SELECT open for Realtime visibility test)
-- (Previous policies "Universal update" and "Management delete" remain active)
