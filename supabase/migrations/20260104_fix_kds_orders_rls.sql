-- Migration: Fix KDS Orders RLS and Visibility
-- Description: Ensures all employees at a location can see active orders for KDS, and explicit Realtime enablement.

-- 1. Enable Realtime for orders table (Command removed as it is already enabled)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- 2. Create a performant, non-recursive RLS policy for KDS visibility
-- We'll drop conflicting policies if they exist, but 'Org access for orders' (028) handles Org Owners.
-- This new policy focuses on EMPLOYEES (Servers, Cooks, Managers) at the location.

DROP POLICY IF EXISTS "Employees can view location orders" ON public.orders;

CREATE POLICY "Employees can view location orders" ON public.orders
FOR SELECT TO authenticated
USING (
  location_id IN (
    SELECT location_id 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 3. Allow Employees to UPDATE orders (for KDS status changes) at their location
DROP POLICY IF EXISTS "Employees can update location orders" ON public.orders;

CREATE POLICY "Employees can update location orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  location_id IN (
    SELECT location_id 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 4. Ensure Managers/Owners can DELETE orders if needed (Cancel)
DROP POLICY IF EXISTS "Managers can delete location orders" ON public.orders;

CREATE POLICY "Managers can delete location orders" ON public.orders
FOR DELETE TO authenticated
USING (
  location_id IN (
    SELECT location_id 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND role IN ('manager', 'owner', 'gm', 'agm')
    AND is_active = true
  )
  OR
  location_id IN (
    SELECT id 
    FROM public.locations 
    WHERE organization_id IN (
        SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  )
);
