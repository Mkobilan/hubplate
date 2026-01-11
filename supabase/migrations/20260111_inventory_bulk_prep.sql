-- Migration: Bulk Prep Support and Unit Syncing
-- Adds output linking to recipes and a helper for syncing units

-- 1. Add produced_inventory_item_id to recipes
-- This allows a recipe to "produce" an inventory item (e.g. Chili recipe produces Chili inventory)
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS produced_inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- 2. Function to sync recipe_unit from recipe_ingredients to inventory_items
-- This helps automate the setup for the user
CREATE OR REPLACE FUNCTION sync_inventory_recipe_units(p_location_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE inventory_items inv
    SET recipe_unit = ri.unit
    FROM recipe_ingredients ri
    JOIN recipes r ON r.id = ri.recipe_id
    WHERE inv.id = ri.inventory_item_id
    AND inv.location_id = p_location_id
    AND (inv.recipe_unit IS NULL OR inv.recipe_unit = inv.unit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enhance deduction logic to prevent negative stock if desired 
-- (Optional: for now we just keep it simple as requested)
