-- Migration: Granular Inventory Deduction
-- Adds units_per_stock and updates deduction math

-- 1. Add units_per_stock to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS units_per_stock DECIMAL(12,4) DEFAULT 1.0;

-- 2. Update the deduction trigger function
-- New Formula: New_Stock = (Total_Recipe_Units - Used) / (Units_Per_Stock * Conversion)
CREATE OR REPLACE FUNCTION log_pour_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_units_per_stock DECIMAL;
    v_conversion_factor DECIMAL;
    v_recipe_unit TEXT;
    v_base_unit TEXT;
    v_total_recipe_units DECIMAL;
    v_divisor DECIMAL;
BEGIN
    -- Get item data
    SELECT 
        COALESCE(units_per_stock, 1.0), 
        COALESCE(conversion_factor, 1.0),
        recipe_unit,
        unit
    INTO 
        v_units_per_stock, 
        v_conversion_factor,
        v_recipe_unit,
        v_base_unit
    FROM inventory_items
    WHERE id = NEW.inventory_item_id;

    -- Safety check for divisors
    IF v_units_per_stock <= 0 THEN v_units_per_stock := 1.0; END IF;
    IF v_conversion_factor <= 0 THEN v_conversion_factor := 1.0; END IF;

    -- The divisor to get back to "Stock Count"
    v_divisor := v_units_per_stock * v_conversion_factor;

    -- Deduct based on unit used
    -- If NEW.unit is the recipe unit (e.g. oz), we calculate deduction from total recipe volume
    IF NEW.unit = v_recipe_unit THEN
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_divisor),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.unit = v_base_unit THEN
        -- If NEW.unit is the base unit (e.g. lb), we deduct based on units per stock
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_units_per_stock),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSE
        -- Default to direct deduction from stock_quantity (assumes quantity is in "Cases/Stock Count")
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
