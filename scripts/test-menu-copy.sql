-- Test script for copy_menu_structure RPC
-- Run this in Supabase SQL editor

DO $$
DECLARE
    src_id UUID;
    dest_id UUID;
    cat_count INTEGER;
    item_count INTEGER;
BEGIN
    -- 1. Create a source location
    INSERT INTO public.locations (name, owner_id, organization_id, is_active, is_paid)
    SELECT 'Source Loc', owner_id, organization_id, true, true 
    FROM public.locations LIMIT 1
    RETURNING id INTO src_id;

    -- 2. Add some menu categories, items, add-ons, and upsells
    INSERT INTO public.menu_categories (location_id, name) VALUES (src_id, 'Test Category 1');
    INSERT INTO public.menu_items (location_id, category_id, name, price) 
    VALUES (src_id, (SELECT id FROM public.menu_categories WHERE location_id = src_id LIMIT 1), 'Test Item 1', 10.00);
    
    INSERT INTO public.add_ons (location_id, name, price) VALUES (src_id, 'Test Addon', 2.00);
    INSERT INTO public.add_on_category_assignments (add_on_id, category_id) 
    SELECT (SELECT id FROM public.add_ons WHERE location_id = src_id LIMIT 1), id 
    FROM public.menu_categories WHERE location_id = src_id LIMIT 1;

    INSERT INTO public.upsells (location_id, name, price) VALUES (src_id, 'Test Upsell', 5.00);
    INSERT INTO public.upsell_assignments (upsell_id, menu_item_id)
    SELECT (SELECT id FROM public.upsells WHERE location_id = src_id LIMIT 1), id 
    FROM public.menu_items WHERE location_id = src_id LIMIT 1;

    -- 3. Create a destination location
    INSERT INTO public.locations (name, owner_id, organization_id, is_active, is_paid)
    SELECT 'Dest Loc', owner_id, organization_id, true, false
    FROM public.locations LIMIT 1
    RETURNING id INTO dest_id;

    -- 4. Run the RPC
    PERFORM public.copy_menu_structure(src_id, dest_id);

    -- 5. Verify results
    SELECT count(*) INTO cat_count FROM public.menu_categories WHERE location_id = dest_id;
    SELECT count(*) INTO item_count FROM public.menu_items WHERE location_id = dest_id;
    
    DECLARE
        addon_count INTEGER;
        upsell_count INTEGER;
    BEGIN
        SELECT count(*) INTO addon_count FROM public.add_ons WHERE location_id = dest_id;
        SELECT count(*) INTO upsell_count FROM public.upsells WHERE location_id = dest_id;

        RAISE NOTICE 'Categories: %, Items: %, Addons: %, Upsells: %', cat_count, item_count, addon_count, upsell_count;
        
        IF cat_count = 1 AND item_count = 1 AND addon_count = 1 AND upsell_count = 1 THEN
            RAISE NOTICE 'TEST PASSED';
        ELSE
            RAISE EXCEPTION 'TEST FAILED: Unexpected counts';
        END IF;
    END;

    -- Cleanup
    -- DELETE FROM public.locations WHERE id IN (src_id, dest_id);
END $$;
