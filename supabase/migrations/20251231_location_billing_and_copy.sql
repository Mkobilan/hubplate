-- Migration to support per-location billing and menu cloning
-- Path: c/hubplate/supabase/migrations/20251231_location_billing_and_copy.sql

-- 1. Add billing columns to locations
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT;

ALTER TABLE public.menu_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. Mark existing locations as paid (retroactive)
UPDATE public.locations SET is_paid = true;

-- 3. Trigger to auto-pay the first location
CREATE OR REPLACE FUNCTION public.auto_pay_first_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.locations 
        WHERE organization_id = NEW.organization_id 
        AND id != NEW.id
    ) THEN
        NEW.is_paid := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_pay_first_location ON public.locations;
CREATE TRIGGER tr_auto_pay_first_location
BEFORE INSERT ON public.locations
FOR EACH ROW EXECUTE FUNCTION public.auto_pay_first_location();

-- 4. RPC to copy menu structure (updated to support add_ons and upsells)
CREATE OR REPLACE FUNCTION public.copy_menu_structure(src_location_id UUID, dest_location_id UUID)
RETURNS void AS $$
DECLARE
    cat_record RECORD;
    item_record RECORD;
    addon_record RECORD;
    upsell_record RECORD;
    new_cat_id UUID;
    new_item_id UUID;
    new_addon_id UUID;
    new_upsell_id UUID;
BEGIN
    -- Temporary table to store ID mappings for accurate linking
    CREATE TEMP TABLE id_mappings (
        old_id UUID,
        new_id UUID,
        type TEXT
    ) ON COMMIT DROP;

    -- 1. Copy Categories
    FOR cat_record IN (SELECT * FROM public.menu_categories WHERE location_id = src_location_id AND is_active = true) LOOP
        -- We try both display_order (orig schema) and sort_order (added recently)
        INSERT INTO public.menu_categories (location_id, name, description, sort_order, is_active)
        VALUES (dest_location_id, cat_record.name, cat_record.description, COALESCE(cat_record.sort_order, 0), cat_record.is_active)
        RETURNING id INTO new_cat_id;
        
        INSERT INTO id_mappings (old_id, new_id, type) VALUES (cat_record.id, new_cat_id, 'category');
    END LOOP;

    -- 2. Copy Items (Matching available column name correctly)
    FOR item_record IN (SELECT * FROM public.menu_items WHERE location_id = src_location_id) LOOP
        -- Find the new category ID
        SELECT new_id INTO new_cat_id FROM id_mappings WHERE old_id = item_record.category_id AND type = 'category';
        
        -- Use available instead of is_available based on schema.sql
        INSERT INTO public.menu_items (location_id, category_id, name, description, price, cost, image_url, available, is_86d, sort_order)
        VALUES (dest_location_id, new_cat_id, item_record.name, item_record.description, item_record.price, item_record.cost, item_record.image_url, item_record.available, item_record.is_86d, COALESCE(item_record.sort_order, 0))
        RETURNING id INTO new_item_id;

        INSERT INTO id_mappings (old_id, new_id, type) VALUES (item_record.id, new_item_id, 'item');
    END LOOP;

    -- 3. Copy Add Ons
    FOR addon_record IN (SELECT * FROM public.add_ons WHERE location_id = src_location_id AND is_active = true) LOOP
        INSERT INTO public.add_ons (location_id, name, price, is_active)
        VALUES (dest_location_id, addon_record.name, addon_record.price, addon_record.is_active)
        RETURNING id INTO new_addon_id;

        INSERT INTO public.add_on_category_assignments (add_on_id, category_id)
        SELECT new_addon_id, m.new_id
        FROM public.add_on_category_assignments a
        JOIN id_mappings m ON a.category_id = m.old_id
        WHERE a.add_on_id = addon_record.id AND m.type = 'category';
    END LOOP;

    -- 4. Copy Upsells
    FOR upsell_record IN (SELECT * FROM public.upsells WHERE location_id = src_location_id AND is_active = true) LOOP
        INSERT INTO public.upsells (location_id, name, price, is_active)
        VALUES (dest_location_id, upsell_record.name, upsell_record.price, upsell_record.is_active)
        RETURNING id INTO new_upsell_id;

        INSERT INTO public.upsell_assignments (upsell_id, category_id)
        SELECT new_upsell_id, m.new_id
        FROM public.upsell_assignments a
        JOIN id_mappings m ON a.category_id = m.old_id
        WHERE a.upsell_id = upsell_record.id AND m.type = 'category';

        INSERT INTO public.upsell_assignments (upsell_id, menu_item_id)
        SELECT new_upsell_id, m.new_id
        FROM public.upsell_assignments a
        JOIN id_mappings m ON m.old_id = a.menu_item_id
        WHERE a.upsell_id = upsell_record.id AND m.type = 'item';
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
