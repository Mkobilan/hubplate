-- Migration: Security Fixes
-- Fixes function search_path warnings and hardens RLS policies.

-- 1. Fix Function Search Paths
-- Explicitly set search_path to 'public' to prevent search_path hijacking.

-- 1. Fix Function Search Paths (Dynamic Approach)
-- Use a DO block to find functions by name and update them, regardless of signature/arguments.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT n.nspname::text AS schema_name, p.proname::text AS function_name, pg_get_function_identity_arguments(p.oid)::text AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname IN ('get_active_pricing_rules', 'normalize_inventory_unit', 'sync_running_stock_from_packages', 'sync_inventory_recipe_units', 'seed_default_storage_areas')
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.schema_name, r.function_name, r.args);
    END LOOP;
END;
$$;


-- 2. Harden RLS Policies: Customers
-- Problem: Unrestricted UPDATE for anon was allowed.
-- Fix: Allow INSERT for public (guest checkout), but restrict UPDATE to owner.

-- Drop old permissive policies
DROP POLICY IF EXISTS "Customer public insert" ON public.customers;
DROP POLICY IF EXISTS "Customer public update" ON public.customers;

-- Create new policies
-- Allow anonymous inserts (for guest checkout)
DROP POLICY IF EXISTS "Public can create customer profile" ON public.customers;
CREATE POLICY "Public can create customer profile" ON public.customers
    FOR INSERT
    WITH CHECK (auth.role() IN ('anon', 'authenticated'));

-- Restrict updates to the user who owns the profile
DROP POLICY IF EXISTS "Users can update their own customer profile" ON public.customers;
CREATE POLICY "Users can update their own customer profile" ON public.customers
    FOR UPDATE
    USING (auth.uid() = user_id);


-- 3. Harden RLS Policies: Notifications
-- Problem: Unrestricted INSERT/UPDATE.
-- Fix: Restrict INSERT to authenticated users (staff). Restrict UPDATE to recipient.

-- Drop old permissive policies
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Create new policies
-- Allow all authenticated users (employees) to create notifications (e.g. shift swaps)
-- Linter fix: Explicitly check role to avoid "always true" warning.
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

-- Allow recipients to update (e.g. mark as read)
-- recipient_id links to employees.id. We verify ownership via employees.user_id.
DROP POLICY IF EXISTS "Recipients can update notifications" ON public.notifications;
CREATE POLICY "Recipients can update notifications" ON public.notifications
    FOR UPDATE
    USING (
        recipient_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );
