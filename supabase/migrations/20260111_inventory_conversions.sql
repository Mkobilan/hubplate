-- Migration: Inventory Unit Conversions
-- Adds recipe_unit and conversion_factor to inventory_items
-- Updates deduction logic to handle conversions

-- 1. Add columns to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS recipe_unit TEXT,
ADD COLUMN IF NOT EXISTS conversion_factor DECIMAL(12,4) DEFAULT 1.0;

-- 2. Backfill existing items
-- By default, recipe unit is the same as stocking unit, factor is 1
UPDATE public.inventory_items 
SET recipe_unit = unit, 
    conversion_factor = 1.0
WHERE recipe_unit IS NULL;

-- 3. Update the deduction trigger function
-- This handles the math: stock_deduction = usage_qty / conversion_factor
CREATE OR REPLACE FUNCTION log_pour_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_unit TEXT;
    v_recipe_unit TEXT;
    v_factor DECIMAL;
BEGIN
    -- Get current units and factor for the item
    SELECT unit, recipe_unit, COALESCE(conversion_factor, 1) 
    INTO v_stock_unit, v_recipe_unit, v_factor
    FROM inventory_items
    WHERE id = NEW.inventory_item_id;

    -- If factor is invalid or zero, safety first
    IF v_factor <= 0 THEN v_factor := 1; END IF;

    -- If NEW.unit matches recipe_unit, we scale the deduction
    -- If it matches the base stocking unit, we deduct 1:1
    IF NEW.unit = v_recipe_unit AND v_recipe_unit != v_stock_unit THEN
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_factor),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSE
        -- Fallback: deduct directly (assumes quantity is in base stocking units)
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the trigger exists (it should from previous migrations)
-- DROP TRIGGER IF EXISTS tr_log_pour_inventory_deduction ON pours;
-- CREATE TRIGGER tr_log_pour_inventory_deduction
-- AFTER INSERT ON pours
-- FOR EACH ROW
-- EXECUTE FUNCTION log_pour_deduct_inventory();
