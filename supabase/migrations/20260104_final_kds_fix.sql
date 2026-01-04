-- Migration: Final Consolidated Order RLS
-- Description: Explicitly handles Employees, Direct Owners, and Org Owners in a single optimized policy.
-- Also cleans up conflicting/orphan policies to ensure "Permissive" mode works as expected.

-- 1. Ensure Realtime is fully enabled (Safety check)
DO $$
BEGIN
    -- Set Replica Identity
    ALTER TABLE public.orders REPLICA IDENTITY FULL;
    
    -- Add to publication if not present
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END $$;

-- 2. Drop ALL existing order access policies to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Org access for orders" ON public.orders; -- Old 028
DROP POLICY IF EXISTS "Employees can view location orders" ON public.orders; -- Recent fix
DROP POLICY IF EXISTS "Employees can update location orders" ON public.orders; -- Recent fix
DROP POLICY IF EXISTS "Managers can delete location orders" ON public.orders; -- Recent fix
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders; -- Potential default
DROP POLICY IF EXISTS "Authenticated users can select orders" ON public.orders; -- Potential default

-- 3. Create UNIVERSAL SELECT Policy (Employees + Owners + Org Owners)
CREATE POLICY "Universal access for orders" ON public.orders
FOR SELECT TO authenticated
USING (
  -- Check 1: Employee at this location
  location_id IN (
    SELECT location_id 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
  OR
  -- Check 2: Direct Location Owner
  location_id IN (
    SELECT id 
    FROM public.locations 
    WHERE owner_id = auth.uid()
  )
  OR
  -- Check 3: Organization Owner (The missing link!)
  location_id IN (
    SELECT l.id
    FROM public.locations l
    JOIN public.organizations o ON l.organization_id = o.id
    WHERE o.owner_id = auth.uid()
  )
);

-- 4. Create UNIVERSAL UPDATE Policy (Employees + Owners)
CREATE POLICY "Universal update for orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  -- Same logic as SELECT for consistency
  -- Check 1: Employee at this location
  location_id IN (
    SELECT location_id 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
  OR
  -- Check 2: Direct Location Owner
  location_id IN (
    SELECT id 
    FROM public.locations 
    WHERE owner_id = auth.uid()
  )
  OR
  -- Check 3: Organization Owner
  location_id IN (
    SELECT l.id
    FROM public.locations l
    JOIN public.organizations o ON l.organization_id = o.id
    WHERE o.owner_id = auth.uid()
  )
);

-- 5. Create DELETE Policy (Managers/Owners only)
CREATE POLICY "Management delete for orders" ON public.orders
FOR DELETE TO authenticated
USING (
  -- Check 1: Manager/Owner Employee
  location_id IN (
    SELECT location_id 
    FROM public.employees 
    WHERE user_id = auth.uid() 
    AND role IN ('manager', 'owner', 'gm', 'agm')
    AND is_active = true
  )
  OR
  -- Check 2: Direct Location Owner
  location_id IN (
    SELECT id 
    FROM public.locations 
    WHERE owner_id = auth.uid()
  )
  OR
  -- Check 3: Organization Owner
  location_id IN (
    SELECT l.id
    FROM public.locations l
    JOIN public.organizations o ON l.organization_id = o.id
    WHERE o.owner_id = auth.uid()
  )
);
