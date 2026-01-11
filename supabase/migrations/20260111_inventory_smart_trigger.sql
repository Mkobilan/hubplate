-- Migration: Smart Inventory Conversion Trigger
-- Updates the deduction logic to handle common units automatically (lb->oz, gal->oz)

CREATE OR REPLACE FUNCTION log_pour_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_units_per_stock DECIMAL;
    v_recipe_unit TEXT;
    v_base_unit TEXT;
    v_smart_conversion DECIMAL := 1.0;
    v_divisor DECIMAL;
BEGIN
    -- Get item data
    SELECT 
        COALESCE(units_per_stock, 1.0), 
        recipe_unit,
        unit
    INTO 
        v_units_per_stock, 
        v_recipe_unit,
        v_base_unit
    FROM inventory_items
    WHERE id = NEW.inventory_item_id;

    -- Safety check for units_per_stock
    IF v_units_per_stock <= 0 THEN v_units_per_stock := 1.0; END IF;

    -- Smart Conversion Logic (Match Frontend)
    IF LOWER(v_base_unit) LIKE '%lb%' AND LOWER(v_recipe_unit) LIKE '%oz%' THEN
        v_smart_conversion := 16.0;
    ELSIF LOWER(v_base_unit) LIKE '%gal%' AND LOWER(v_recipe_unit) LIKE '%oz%' THEN
        v_smart_conversion := 128.0;
    END IF;

    -- The divisor to get back to "Stock Count"
    v_divisor := v_units_per_stock * v_smart_conversion;

    -- Deduct based on unit used
    IF NEW.unit = v_recipe_unit THEN
        -- Quantity is in Recipe Units (e.g., oz)
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_divisor),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.unit = v_base_unit THEN
        -- Quantity is in Stocking Units (e.g., lb)
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_units_per_stock),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSE
        -- Default to direct deduction from stock_quantity (assumes quantity is in "Stock Count")
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
