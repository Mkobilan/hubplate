-- Migration: Comprehensive Location Copy
-- Path: c/hubplate/supabase/migrations/20260115_comprehensive_location_copy.sql
-- Description: Adds a comprehensive RPC clone_location_data to copy menu, recipes, and inventory with relational integrity.

CREATE OR REPLACE FUNCTION public.clone_location_data(
    src_location_id UUID, 
    dest_location_id UUID,
    p_copy_menu BOOLEAN DEFAULT TRUE,
    p_copy_recipes BOOLEAN DEFAULT FALSE,
    p_copy_inventory BOOLEAN DEFAULT FALSE
)
RETURNS void AS $$
DECLARE
    -- Records for looping
    rec RECORD;
    rec_inner RECORD;
    -- Mapping IDs
    v_new_id UUID;
    v_new_cat_id UUID;
    v_new_item_id UUID;
BEGIN
    -- Temporary table to store ID mappings for accurate linking across clones
    CREATE TEMP TABLE id_mappings (
        old_id UUID,
        new_id UUID,
        type TEXT
    ) ON COMMIT DROP;

    -- 1. Copy Inventory Storage Areas
    IF p_copy_inventory THEN
        FOR rec IN (SELECT * FROM public.inventory_storage_areas WHERE location_id = src_location_id) LOOP
            INSERT INTO public.inventory_storage_areas (location_id, name, is_default, sort_order)
            VALUES (dest_location_id, rec.name, rec.is_default, COALESCE(rec.sort_order, 0))
            RETURNING id INTO v_new_id;
            
            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'storage_area');
        END LOOP;
    END IF;

    -- 2. Copy Inventory Items
    IF p_copy_inventory THEN
        FOR rec IN (SELECT * FROM public.inventory_items WHERE location_id = src_location_id) LOOP
            -- Get new storage area if it was mapped, otherwise NULL
            SELECT new_id INTO v_new_id FROM id_mappings WHERE old_id = rec.storage_area_id AND type = 'storage_area';
            
            INSERT INTO public.inventory_items (
                location_id, name, category, unit, cost_per_unit, 
                stock_quantity, min_stock, par_level, storage_area_id,
                supplier, sku, recipe_unit, units_per_stock, conversion_factor,
                running_stock, is_active, metadata
            )
            VALUES (
                dest_location_id, rec.name, rec.category, rec.unit, rec.cost_per_unit,
                rec.stock_quantity, rec.min_stock, rec.par_level, v_new_id,
                rec.supplier, rec.sku, rec.recipe_unit, COALESCE(rec.units_per_stock, 1.0), COALESCE(rec.conversion_factor, 1.0),
                rec.running_stock, rec.is_active, COALESCE(rec.metadata, '{}'::jsonb)
            )
            RETURNING id INTO v_new_id;

            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'inventory_item');
        END LOOP;
    END IF;

    -- 3. Copy Menu Categories
    IF p_copy_menu THEN
        FOR rec IN (SELECT * FROM public.menu_categories WHERE location_id = src_location_id AND is_active = true) LOOP
            INSERT INTO public.menu_categories (location_id, name, sort_order, is_active)
            VALUES (dest_location_id, rec.name, COALESCE(rec.sort_order, 0), rec.is_active)
            RETURNING id INTO v_new_id;
            
            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'category');
        END LOOP;
    END IF;

    -- 4. Copy Menu Items
    IF p_copy_menu THEN
        FOR rec IN (SELECT * FROM public.menu_items WHERE location_id = src_location_id) LOOP
            -- Find the new category ID
            SELECT new_id INTO v_new_cat_id FROM id_mappings WHERE old_id = rec.category_id AND type = 'category';
            
            INSERT INTO public.menu_items (
                location_id, category_id, name, description, price, 
                cost, image_url, available, is_86d, sort_order
            )
            VALUES (
                dest_location_id, v_new_cat_id, rec.name, rec.description, rec.price,
                rec.cost, rec.image_url, COALESCE(rec.available, true), rec.is_86d, COALESCE(rec.sort_order, 0)
            )
            RETURNING id INTO v_new_id;

            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'item');
        END LOOP;
    END IF;

    -- 5. Copy Add-ons and their Assignments
    IF p_copy_menu THEN
        FOR rec IN (SELECT * FROM public.add_ons WHERE location_id = src_location_id AND is_active = true) LOOP
            INSERT INTO public.add_ons (location_id, name, price, is_active)
            VALUES (dest_location_id, rec.name, rec.price, rec.is_active)
            RETURNING id INTO v_new_id;

            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'add_on');

            -- Copy assignments from add_on_assignments
            FOR rec_inner IN (SELECT * FROM public.add_on_assignments WHERE add_on_id = rec.id) LOOP
                v_new_cat_id := NULL;
                v_new_item_id := NULL;
                
                IF rec_inner.category_id IS NOT NULL THEN
                    SELECT new_id INTO v_new_cat_id FROM id_mappings WHERE old_id = rec_inner.category_id AND type = 'category';
                END IF;
                
                IF rec_inner.menu_item_id IS NOT NULL THEN
                    SELECT new_id INTO v_new_item_id FROM id_mappings WHERE old_id = rec_inner.menu_item_id AND type = 'item';
                END IF;

                IF v_new_cat_id IS NOT NULL OR v_new_item_id IS NOT NULL THEN
                    INSERT INTO public.add_on_assignments (add_on_id, menu_item_id, category_id)
                    VALUES (v_new_id, v_new_item_id, v_new_cat_id);
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- 6. Copy Sides and their Assignments
    IF p_copy_menu THEN
        FOR rec IN (SELECT * FROM public.sides WHERE location_id = src_location_id AND is_active = true) LOOP
            INSERT INTO public.sides (location_id, name, price, is_active)
            VALUES (dest_location_id, rec.name, rec.price, rec.is_active)
            RETURNING id INTO v_new_id;

            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'side');

            -- Copy assignments from side_assignments
            FOR rec_inner IN (SELECT * FROM public.side_assignments WHERE side_id = rec.id) LOOP
                v_new_cat_id := NULL;
                v_new_item_id := NULL;
                
                IF rec_inner.category_id IS NOT NULL THEN
                    SELECT new_id INTO v_new_cat_id FROM id_mappings WHERE old_id = rec_inner.category_id AND type = 'category';
                END IF;
                
                IF rec_inner.menu_item_id IS NOT NULL THEN
                    SELECT new_id INTO v_new_item_id FROM id_mappings WHERE old_id = rec_inner.menu_item_id AND type = 'item';
                END IF;

                IF v_new_cat_id IS NOT NULL OR v_new_item_id IS NOT NULL THEN
                    INSERT INTO public.side_assignments (side_id, menu_item_id, category_id)
                    VALUES (v_new_id, v_new_item_id, v_new_cat_id);
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- 7. Copy Dressings and their Assignments
    IF p_copy_menu THEN
        FOR rec IN (SELECT * FROM public.dressings WHERE location_id = src_location_id AND is_active = true) LOOP
            INSERT INTO public.dressings (location_id, name, price, is_active)
            VALUES (dest_location_id, rec.name, rec.price, rec.is_active)
            RETURNING id INTO v_new_id;

            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'dressing');

            -- Copy assignments from dressing_assignments
            FOR rec_inner IN (SELECT * FROM public.dressing_assignments WHERE dressing_id = rec.id) LOOP
                v_new_cat_id := NULL;
                v_new_item_id := NULL;
                
                IF rec_inner.category_id IS NOT NULL THEN
                    SELECT new_id INTO v_new_cat_id FROM id_mappings WHERE old_id = rec_inner.category_id AND type = 'category';
                END IF;
                
                IF rec_inner.menu_item_id IS NOT NULL THEN
                    SELECT new_id INTO v_new_item_id FROM id_mappings WHERE old_id = rec_inner.menu_item_id AND type = 'item';
                END IF;

                IF v_new_cat_id IS NOT NULL OR v_new_item_id IS NOT NULL THEN
                    INSERT INTO public.dressing_assignments (dressing_id, menu_item_id, category_id)
                    VALUES (v_new_id, v_new_item_id, v_new_cat_id);
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    -- 8. Copy Recipes and their Ingredients/Links
    IF p_copy_recipes THEN
        FOR rec IN (SELECT * FROM public.recipes WHERE location_id = src_location_id AND is_active = true) LOOP
            INSERT INTO public.recipes (location_id, name, description, instructions, image_url, is_active)
            VALUES (dest_location_id, rec.name, rec.description, rec.instructions, rec.image_url, rec.is_active)
            RETURNING id INTO v_new_id;

            INSERT INTO id_mappings (old_id, new_id, type) VALUES (rec.id, v_new_id, 'recipe');

            -- Copy recipe ingredients
            INSERT INTO public.recipe_ingredients (recipe_id, inventory_item_id, ingredient_name, quantity_used, unit)
            SELECT v_new_id, m_inv.new_id, ri.ingredient_name, ri.quantity_used, ri.unit
            FROM public.recipe_ingredients ri
            LEFT JOIN id_mappings m_inv ON ri.inventory_item_id = m_inv.old_id AND m_inv.type = 'inventory_item'
            WHERE ri.recipe_id = rec.id;

            -- Copy link to menu items (if menu was copied)
            INSERT INTO public.recipe_menu_items (recipe_id, menu_item_id)
            SELECT v_new_id, m_item.new_id
            FROM public.recipe_menu_items rmi
            JOIN id_mappings m_item ON rmi.menu_item_id = m_item.old_id AND m_item.type = 'item'
            WHERE rmi.recipe_id = rec.id;
        END LOOP;
    END IF;

    -- 9. Copy Recipe Links for Add-ons, Sides, Dressings (if both recipes and menu copied)
    IF p_copy_recipes AND p_copy_menu THEN
        -- Add-on Recipe Links
        INSERT INTO public.add_on_recipe_links (add_on_id, recipe_id)
        SELECT m_ao.new_id, m_rec.new_id
        FROM public.add_on_recipe_links link
        JOIN id_mappings m_ao ON link.add_on_id = m_ao.old_id AND m_ao.type = 'add_on'
        JOIN id_mappings m_rec ON link.recipe_id = m_rec.old_id AND m_rec.type = 'recipe'
        WHERE NOT EXISTS (SELECT 1 FROM public.add_on_recipe_links WHERE add_on_id = m_ao.new_id AND recipe_id = m_rec.new_id);

        -- Side Recipe Links
        INSERT INTO public.side_recipe_links (side_id, recipe_id)
        SELECT m_side.new_id, m_rec.new_id
        FROM public.side_recipe_links link
        JOIN id_mappings m_side ON link.side_id = m_side.old_id AND m_side.type = 'side'
        JOIN id_mappings m_rec ON link.recipe_id = m_rec.old_id AND m_rec.type = 'recipe'
        WHERE NOT EXISTS (SELECT 1 FROM public.side_recipe_links WHERE side_id = m_side.new_id AND recipe_id = m_rec.new_id);

        -- Dressing Recipe Links
        INSERT INTO public.dressing_recipe_links (dressing_id, recipe_id)
        SELECT m_dress.new_id, m_rec.new_id
        FROM public.dressing_recipe_links link
        JOIN id_mappings m_dress ON link.dressing_id = m_dress.old_id AND m_dress.type = 'dressing'
        JOIN id_mappings m_rec ON link.recipe_id = m_rec.old_id AND m_rec.type = 'recipe'
        WHERE NOT EXISTS (SELECT 1 FROM public.dressing_recipe_links WHERE dressing_id = m_dress.new_id AND recipe_id = m_rec.new_id);
    END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
