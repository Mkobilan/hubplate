-- Migration: Flexible Recipe Ingredients
-- Allows storing ingredients without requiring inventory match
-- Enables "Sync" feature to match ingredients to inventory later

-- Add ingredient_name column to store the raw ingredient name from CSV
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_name TEXT;

-- Make inventory_item_id nullable (ingredient can exist without inventory link)
ALTER TABLE recipe_ingredients ALTER COLUMN inventory_item_id DROP NOT NULL;

-- Add quantity_raw column for human-readable display (e.g., "2 oz", "1 dash")
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS quantity_raw TEXT;

-- Backfill ingredient_name from existing linked inventory items
UPDATE recipe_ingredients ri
SET ingredient_name = inv.name
FROM inventory_items inv
WHERE ri.inventory_item_id = inv.id
AND ri.ingredient_name IS NULL;
