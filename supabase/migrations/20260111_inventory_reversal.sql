-- Migration: Inventory Reversal
-- Handles automatic inventory restoration when pours are deleted or orders are cancelled.

-- 0. Add parent_item_quantity and fix foreign key for cascading deletes
ALTER TABLE pours 
ADD COLUMN IF NOT EXISTS parent_item_quantity DECIMAL(10,4);

-- Re-link order_id with CASCADE so deleting an order restores inventory automatically
ALTER TABLE pours DROP CONSTRAINT IF EXISTS pours_order_id_fkey;
ALTER TABLE pours ADD CONSTRAINT pours_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- 1. Refactor the deduction trigger to support ALL operations (INSERT, UPDATE, DELETE)
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
    v_qty DECIMAL;
    v_inv_id UUID;
BEGIN
    -- STEP 1: RESTORE STOCK (FOR DELETE OR UPDATE)
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
        v_inv_id := OLD.inventory_item_id;
        v_qty := OLD.quantity;
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
        v_divisor := v_units_per_stock * v_smart_conversion;

        IF v_norm_unit = v_norm_recipe THEN
            UPDATE inventory_items SET stock_quantity = stock_quantity + (v_qty / v_divisor), updated_at = NOW() WHERE id = v_inv_id;
        ELSIF v_norm_unit = v_norm_base THEN
            UPDATE inventory_items SET stock_quantity = stock_quantity + (v_qty / v_units_per_stock), updated_at = NOW() WHERE id = v_inv_id;
        ELSE
            UPDATE inventory_items SET stock_quantity = stock_quantity + (v_qty / v_divisor), updated_at = NOW() WHERE id = v_inv_id;
        END IF;
    END IF;

    -- STEP 2: DEDUCT STOCK (FOR INSERT OR UPDATE)
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_inv_id := NEW.inventory_item_id;
        v_qty := NEW.quantity;
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
        v_divisor := v_units_per_stock * v_smart_conversion;

        IF v_norm_unit = v_norm_recipe THEN
            UPDATE inventory_items SET stock_quantity = stock_quantity - (v_qty / v_divisor), updated_at = NOW() WHERE id = v_inv_id;
        ELSIF v_norm_unit = v_norm_base THEN
            UPDATE inventory_items SET stock_quantity = stock_quantity - (v_qty / v_units_per_stock), updated_at = NOW() WHERE id = v_inv_id;
        ELSE
            UPDATE inventory_items SET stock_quantity = stock_quantity - (v_qty / v_divisor), updated_at = NOW() WHERE id = v_inv_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the existing trigger to support all operations
DROP TRIGGER IF EXISTS tr_log_pour_inventory_deduction ON pours;
CREATE TRIGGER tr_log_pour_inventory_deduction
AFTER INSERT OR UPDATE OR DELETE ON pours
FOR EACH ROW
EXECUTE FUNCTION log_pour_deduct_inventory();

-- 3. Add order cancellation trigger to restore inventory
CREATE OR REPLACE FUNCTION handle_order_cancelled_inventory_reversal()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'cancelled', delete associated pours (triggers stock restoration)
    IF (NEW.status = 'cancelled' AND OLD.status != 'cancelled') THEN
        DELETE FROM public.pours WHERE order_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_order_cancellation_inventory_reversal ON orders;
CREATE TRIGGER tr_order_cancellation_inventory_reversal
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION handle_order_cancelled_inventory_reversal();
