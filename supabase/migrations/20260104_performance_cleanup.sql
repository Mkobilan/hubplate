-- Migration: Performance Cleanup & Policy Consolidation
-- Description: Fixes `auth_rls_initplan` warnings and `multiple_permissive_policies` by consolidating redundant RLS policies.

-- 1. FIX ORDERS: Wrap auth functions & Remove Debug Policy
-- Drop ALL existing policies on orders to ensure a clean slate
DROP POLICY IF EXISTS "Universal update for orders" ON public.orders;
DROP POLICY IF EXISTS "Management delete for orders" ON public.orders;
DROP POLICY IF EXISTS "Debug Open Access" ON public.orders; -- Remove the debug policy
DROP POLICY IF EXISTS "Order access" ON public.orders; -- Potential old policy
DROP POLICY IF EXISTS "Universal access for orders" ON public.orders; -- Previous attempt name

-- Re-create consolidated, optimized policies for ORDERS
-- Optimization: Wrap `auth.uid()` in `(select auth.uid())` to prevent row-by-row re-evaluation.

-- POLICY 1: VIEW (Select)
-- Allows:
--  1. Employees at the location
--  2. Owners of the location
--  3. Organization Owners
CREATE POLICY "Universal view for orders" ON public.orders
FOR SELECT TO authenticated
USING (
    location_id IN (
        -- Employees
        SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
        UNION
        -- Location Owners
        SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        UNION
        -- Organization Owners
        SELECT l.id 
        FROM public.locations l
        JOIN public.organizations o ON l.organization_id = o.id
        WHERE o.owner_id = (select auth.uid())
    )
);

-- POLICY 2: UPDATE
-- Same logic as View, but explicit for updates
CREATE POLICY "Universal update for orders" ON public.orders
FOR UPDATE TO authenticated
USING (
    location_id IN (
        SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
        UNION
        SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        UNION
        SELECT l.id 
        FROM public.locations l
        JOIN public.organizations o ON l.organization_id = o.id
        WHERE o.owner_id = (select auth.uid())
    )
);

-- POLICY 3: DELETE
-- Restricted to Managers and Owners
CREATE POLICY "Management delete for orders" ON public.orders
FOR DELETE TO authenticated
USING (
    location_id IN (
        -- Managers/Admins only
        SELECT location_id FROM public.employees 
        WHERE user_id = (select auth.uid()) 
        AND role IN ('manager', 'admin', 'owner', 'gm')
        UNION
        -- Location Owners
        SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        UNION
        -- Organization Owners
        SELECT l.id 
        FROM public.locations l
        JOIN public.organizations o ON l.organization_id = o.id
        WHERE o.owner_id = (select auth.uid())
    )
);


-- 2. FIX HISTORICAL_SALES: Consolidate Policies
-- Drop duplicate/overlapping policies
DROP POLICY IF EXISTS "Location access for historical_sales" ON public.historical_sales;
DROP POLICY IF EXISTS "Users can view historical sales" ON public.historical_sales;
DROP POLICY IF EXISTS "Users can manage historical sales" ON public.historical_sales;

-- Create Single Consolidated Policy
CREATE POLICY "Consolidated access for historical_sales" ON public.historical_sales
FOR ALL TO authenticated
USING (
    location_id IN (
        -- Employees (View)
        SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
        UNION
        -- Owners (Manage)
        SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
    )
);

-- 3. FIX POURS: Consolidate Policies
DROP POLICY IF EXISTS "Users can manage pours" ON public.pours;
DROP POLICY IF EXISTS "Users can view pours" ON public.pours;

CREATE POLICY "Consolidated access for pours" ON public.pours
FOR ALL TO authenticated
USING (
    location_id IN (
        SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
        UNION
        SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
    )
);

-- 4. FIX RECIPES: Consolidate Policies
DROP POLICY IF EXISTS "Users can manage recipes for their locations" ON public.recipes;
DROP POLICY IF EXISTS "Users can view recipes for their locations" ON public.recipes;

CREATE POLICY "Consolidated access for recipes" ON public.recipes
FOR ALL TO authenticated
USING (
    location_id IN (
        SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
        UNION
        SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
    )
);

-- 5. FIX RECIPE_INGREDIENTS: Consolidate Policies
DROP POLICY IF EXISTS "Users can manage recipe ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Users can view recipe ingredients" ON public.recipe_ingredients;

CREATE POLICY "Consolidated access for recipe_ingredients" ON public.recipe_ingredients
FOR ALL TO authenticated
USING (
    recipe_id IN (
        SELECT id FROM public.recipes WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    )
);

-- 6. FIX RECIPE_MENU_ITEMS: Consolidate Policies
DROP POLICY IF EXISTS "Users can manage recipe menu items" ON public.recipe_menu_items;
DROP POLICY IF EXISTS "Users can view recipe menu items" ON public.recipe_menu_items;

CREATE POLICY "Consolidated access for recipe_menu_items" ON public.recipe_menu_items
FOR ALL TO authenticated
USING (
    recipe_id IN (
        SELECT id FROM public.recipes WHERE location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
            UNION
            SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
        )
    )
);

-- 7. FIX PRICING_RULES: Consolidate Policies
DROP POLICY IF EXISTS "Users can manage pricing rules" ON public.pricing_rules;
DROP POLICY IF EXISTS "Users can view pricing rules" ON public.pricing_rules;

CREATE POLICY "Consolidated access for pricing_rules" ON public.pricing_rules
FOR ALL TO authenticated
USING (
    location_id IN (
        SELECT location_id FROM public.employees WHERE user_id = (select auth.uid())
        UNION
        SELECT id FROM public.locations WHERE owner_id = (select auth.uid())
    )
);
