-- Migration: Unit Neutral Inventory Deduction (Robust Version)
-- Ensures that 'bun', 'each', '1', 'pc', etc. are treated interchangeably.
-- Fixes the over-deduction bug where whole packages were subtracted on mismatch.

CREATE OR REPLACE FUNCTION normalize_inventory_unit(u TEXT) 
RETURNS TEXT AS $$
DECLARE
    clean TEXT;
BEGIN
    IF u IS NULL OR TRIM(u) = '' THEN RETURN 'count'; END IF;
    
    -- Lowercase and trim
    clean := LOWER(TRIM(u));
    
    -- Remove leading numbers and spaces (e.g., "1 pc" -> "pc", "8 oz" -> "oz")
    -- This handles users putting counts/measurements in the unit field
    clean := REGEXP_REPLACE(clean, '^[0-9.]+\s*', '');
    
    -- If it's now empty, it was just a number (e.g., "1"), so it's a count
    IF clean = '' THEN RETURN 'count'; END IF;

    -- Handle pluralization (remove trailing 's' unless it's 'oz' or 'glass')
    IF clean NOT IN ('oz', 'glass', 'msc', 'pcs') AND clean LIKE '%s' THEN
        clean := LEFT(clean, LENGTH(clean) - 1);
    END IF;
    
    -- Synonyms for "count"
    IF clean IN ('1', 'unit', 'each', 'pc', 'piece', 'bun', 'item', 'ea', 'count', 'pk', 'pkg', 'bottle', 'can', 'container', 'log') THEN
        RETURN 'count';
    END IF;
    
    -- Variants of oz
    IF clean IN ('oz', 'ounce', 'fl oz', 'fl-oz') THEN
        RETURN 'oz';
    END IF;
    
    -- Variants of lb
    IF clean IN ('lb', 'lbs', 'pound') THEN
        RETURN 'lb';
    END IF;
    
    -- Variants of gal
    IF clean IN ('gal', 'gallon', 'gals') THEN
        RETURN 'gal';
    END IF;

    RETURN clean;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION log_pour_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_units_per_stock DECIMAL;
    v_recipe_unit TEXT;
    v_base_unit TEXT;
    v_smart_conversion DECIMAL := 1.0;
    v_divisor DECIMAL;
    v_norm_new TEXT;
    v_norm_recipe TEXT;
    v_norm_base TEXT;
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

    -- Normalize all units for comparison
    v_norm_new := normalize_inventory_unit(NEW.unit);
    v_norm_recipe := normalize_inventory_unit(v_recipe_unit);
    v_norm_base := normalize_inventory_unit(v_base_unit);

    -- Smart Conversion Logic (Match Frontend)
    -- If we are going from lbs/gal to oz
    IF (v_norm_base = 'lb' OR LOWER(v_base_unit) LIKE '%lb%') AND v_norm_recipe = 'oz' THEN
        v_smart_conversion := 16.0;
    ELSIF (v_norm_base = 'gal' OR LOWER(v_base_unit) LIKE '%gal%') AND v_norm_recipe = 'oz' THEN
        v_smart_conversion := 128.0;
    END IF;

    -- The divisor to get from "Recipe Unit" back to "Stock Unit"
    v_divisor := v_units_per_stock * v_smart_conversion;

    -- Deduct based on normalized match
    IF v_norm_new = v_norm_recipe THEN
        -- Quantity is in Recipe Units (the most common case for orders)
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_divisor),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSIF v_norm_new = v_norm_base THEN
        -- Quantity is in Base Stocking Units (e.g., logging a whole case)
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_units_per_stock),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSE
        -- SAFETY FALLBACK: 
        -- If we don't know the unit, assume it's the SMALLEST unit possible (the Recipe Unit)
        -- to prevent huge over-deductions.
        -- We still divide by v_divisor because most logs come from recipes.
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity - (NEW.quantity / v_divisor),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
