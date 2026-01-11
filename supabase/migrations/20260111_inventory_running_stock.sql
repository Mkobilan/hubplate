-- Migration: Inventory Running Stock
-- Solves precision issues by tracking counts in atomic units (running_stock) 
-- instead of divided package units (stock_quantity).

-- 1. Structural Changes
-- We must drop triggers that depend on stock_quantity BEFORE altering its type
DROP TRIGGER IF EXISTS tr_sync_running_stock_from_packages ON inventory_items;
DROP TRIGGER IF EXISTS tr_log_pour_inventory_deduction ON pours; -- This trigger function also uses it

ALTER TABLE public.inventory_items 
ALTER COLUMN stock_quantity TYPE DECIMAL(15,4);

-- 2. New Column
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS running_stock DECIMAL(15,4) DEFAULT 0;

-- 3. Removed: tr_sync_running_stock_from_packages
-- This trigger has been removed to decouple Running Stock from Stock Unit/Meas.
-- Users will now manually sync the column via the UI dropdown.

-- 4. Update the Deduction Trigger to use running_stock as truth
CREATE OR REPLACE FUNCTION log_pour_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_units_per_stock DECIMAL;
    v_recipe_unit TEXT;
    v_base_unit TEXT;
    v_smart_conversion DECIMAL;
    v_divisor DECIMAL;
    v_norm_recipe TEXT;
    v_norm_base TEXT;
    v_norm_unit TEXT;
    v_usage_qty DECIMAL; -- Quantity in atomic units
    v_inv_id UUID;
BEGIN
    -- STEP 1: RESTORE STOCK (FOR DELETE OR UPDATE)
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
        v_inv_id := OLD.inventory_item_id;
        v_norm_unit := normalize_inventory_unit(OLD.unit);

        SELECT COALESCE(units_per_stock, 1.0), recipe_unit, unit 
        INTO v_units_per_stock, v_recipe_unit, v_base_unit
        FROM inventory_items WHERE id = v_inv_id;

        IF v_units_per_stock <= 0 THEN v_units_per_stock := 1.0; END IF;
        v_norm_recipe := normalize_inventory_unit(v_recipe_unit);
        v_norm_base := normalize_inventory_unit(v_base_unit);
        
        v_smart_conversion := 1.0;
        IF (v_norm_base = 'lb' OR LOWER(v_base_unit) LIKE '%lb%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 16.0;
        ELSIF (v_norm_base = 'gal' OR LOWER(v_base_unit) LIKE '%gal%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 128.0;
        END IF;

        -- Convert the OLD log quantity back to ABSOLUTE atomic units
        IF v_norm_unit = v_norm_recipe THEN
            v_usage_qty := OLD.quantity;
        ELSIF v_norm_unit = v_norm_base THEN
            IF v_norm_unit IN ('oz', 'lb', 'gal') THEN
                v_usage_qty := OLD.quantity * v_smart_conversion;
            ELSE
                v_usage_qty := OLD.quantity * v_units_per_stock * v_smart_conversion;
            END IF;
        ELSIF v_norm_unit IN ('lb', 'gal') AND v_norm_recipe = 'oz' THEN
            IF v_norm_unit = 'lb' THEN v_usage_qty := OLD.quantity * 16.0;
            ELSE v_usage_qty := OLD.quantity * 128.0;
            END IF;
        ELSE
            v_usage_qty := OLD.quantity;
        END IF;

        -- Update the Atomic count (running_stock)
        UPDATE inventory_items 
        SET running_stock = running_stock + v_usage_qty,
            updated_at = NOW() 
        WHERE id = v_inv_id;
    END IF;

    -- STEP 2: DEDUCT STOCK (FOR INSERT OR UPDATE)
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_inv_id := NEW.inventory_item_id;
        v_norm_unit := normalize_inventory_unit(NEW.unit);

        SELECT COALESCE(units_per_stock, 1.0), recipe_unit, unit 
        INTO v_units_per_stock, v_recipe_unit, v_base_unit
        FROM inventory_items WHERE id = v_inv_id;

        IF v_units_per_stock <= 0 THEN v_units_per_stock := 1.0; END IF;
        v_norm_recipe := normalize_inventory_unit(v_recipe_unit);
        v_norm_base := normalize_inventory_unit(v_base_unit);
        
        v_smart_conversion := 1.0;
        IF (v_norm_base = 'lb' OR LOWER(v_base_unit) LIKE '%lb%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 16.0;
        ELSIF (v_norm_base = 'gal' OR LOWER(v_base_unit) LIKE '%gal%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 128.0;
        END IF;

        -- Convert the NEW log quantity to ABSOLUTE atomic units (same as running_stock)
        IF v_norm_unit = v_norm_recipe THEN
            -- 1. Exact match with atomic unit (e.g. oz to oz)
            v_usage_qty := NEW.quantity;
        ELSIF v_norm_unit = v_norm_base THEN
            -- 2. Matches the base stocking unit (e.g. lbs to lbs)
            -- If it's a known measurement unit, we ONLY multiply by the conversion (16/128)
            -- We DON'T multiply by units_per_stock (e.g. 5 cases) because the log is in lbs, not cases.
            IF v_norm_unit IN ('oz', 'lb', 'gal') THEN
                v_usage_qty := NEW.quantity * v_smart_conversion;
            ELSE
                -- It's a package unit (e.g. "Case", "Box")
                v_usage_qty := NEW.quantity * v_units_per_stock * v_smart_conversion;
            END IF;
        ELSIF v_norm_unit IN ('lb', 'gal') AND v_norm_recipe = 'oz' THEN
            -- 3. Cross-conversion (Logging in lbs when recipe is in oz, but base might be 'Case')
            IF v_norm_unit = 'lb' THEN v_usage_qty := NEW.quantity * 16.0;
            ELSE v_usage_qty := NEW.quantity * 128.0;
            END IF;
        ELSE
            -- 4. Fallback: Assume it's the atomic unit
            v_usage_qty := NEW.quantity;
        END IF;

        UPDATE inventory_items 
        SET running_stock = running_stock - v_usage_qty,
            updated_at = NOW() 
        WHERE id = v_inv_id;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger that was dropped at the start
DROP TRIGGER IF EXISTS tr_log_pour_inventory_deduction ON pours;
CREATE TRIGGER tr_log_pour_inventory_deduction
AFTER INSERT OR UPDATE OR DELETE ON pours
FOR EACH ROW
EXECUTE FUNCTION log_pour_deduct_inventory();
