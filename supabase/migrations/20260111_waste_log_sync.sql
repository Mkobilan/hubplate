-- Migration: Sync Waste Logs with Running Stock
-- Ensures that logging waste (expired beef, broken buns) deducts from live inventory bucket.

CREATE OR REPLACE FUNCTION log_waste_sync_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_units_per_stock DECIMAL;
    v_recipe_unit TEXT;
    v_base_unit TEXT;
    v_smart_conversion DECIMAL;
    v_norm_recipe TEXT;
    v_norm_base TEXT;
    v_norm_unit TEXT;
    v_usage_qty DECIMAL; -- Quantity in atomic units
    v_inv_id UUID;
BEGIN
    -- 1. RESTORE STOCK (FOR DELETE OR UPDATE)
    IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.inventory_item_id IS NOT NULL THEN
        v_inv_id := OLD.inventory_item_id;
        v_norm_unit := normalize_inventory_unit(OLD.unit);

        SELECT COALESCE(units_per_stock, 1.0), recipe_unit, unit 
        INTO v_units_per_stock, v_recipe_unit, v_base_unit
        FROM inventory_items WHERE id = v_inv_id;

        IF v_units_per_stock IS NOT NULL THEN
            IF v_units_per_stock <= 0 THEN v_units_per_stock := 1.0; END IF;
            v_norm_recipe := normalize_inventory_unit(v_recipe_unit);
            v_norm_base := normalize_inventory_unit(v_base_unit);
            
            v_smart_conversion := 1.0;
            IF (v_norm_base = 'lb' OR LOWER(v_base_unit) LIKE '%lb%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 16.0;
            ELSIF (v_norm_base = 'gal' OR LOWER(v_base_unit) LIKE '%gal%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 128.0;
            END IF;

            -- Convert OLD quantity back to atomic
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

            UPDATE inventory_items 
            SET running_stock = running_stock + v_usage_qty,
                updated_at = NOW() 
            WHERE id = v_inv_id;
        END IF;
    END IF;

    -- 2. DEDUCT STOCK (FOR INSERT OR UPDATE)
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.inventory_item_id IS NOT NULL THEN
        v_inv_id := NEW.inventory_item_id;
        v_norm_unit := normalize_inventory_unit(NEW.unit);

        SELECT COALESCE(units_per_stock, 1.0), recipe_unit, unit 
        INTO v_units_per_stock, v_recipe_unit, v_base_unit
        FROM inventory_items WHERE id = v_inv_id;

        IF v_units_per_stock IS NOT NULL THEN
            IF v_units_per_stock <= 0 THEN v_units_per_stock := 1.0; END IF;
            v_norm_recipe := normalize_inventory_unit(v_recipe_unit);
            v_norm_base := normalize_inventory_unit(v_base_unit);
            
            v_smart_conversion := 1.0;
            IF (v_norm_base = 'lb' OR LOWER(v_base_unit) LIKE '%lb%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 16.0;
            ELSIF (v_norm_base = 'gal' OR LOWER(v_base_unit) LIKE '%gal%') AND v_norm_recipe = 'oz' THEN v_smart_conversion := 128.0;
            END IF;

            -- Convert NEW quantity to atomic
            IF v_norm_unit = v_norm_recipe THEN
                v_usage_qty := NEW.quantity;
            ELSIF v_norm_unit = v_norm_base THEN
                IF v_norm_unit IN ('oz', 'lb', 'gal') THEN
                    v_usage_qty := NEW.quantity * v_smart_conversion;
                ELSE
                    v_usage_qty := NEW.quantity * v_units_per_stock * v_smart_conversion;
                END IF;
            ELSIF v_norm_unit IN ('lb', 'gal') AND v_norm_recipe = 'oz' THEN
                IF v_norm_unit = 'lb' THEN v_usage_qty := NEW.quantity * 16.0;
                ELSE v_usage_qty := NEW.quantity * 128.0;
                END IF;
            ELSE
                v_usage_qty := NEW.quantity;
            END IF;

            UPDATE inventory_items 
            SET running_stock = running_stock - v_usage_qty,
                updated_at = NOW() 
            WHERE id = v_inv_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS tr_log_waste_sync_inventory ON waste_logs;
CREATE TRIGGER tr_log_waste_sync_inventory
AFTER INSERT OR UPDATE OR DELETE ON waste_logs
FOR EACH ROW
EXECUTE FUNCTION log_waste_sync_inventory();
