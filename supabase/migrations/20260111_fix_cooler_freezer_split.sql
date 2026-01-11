-- 1. Create separate areas if they don't exist for all locations
INSERT INTO public.inventory_storage_areas (location_id, name)
SELECT id, 'Walk in Cooler' FROM public.locations
ON CONFLICT (location_id, name) DO NOTHING;

INSERT INTO public.inventory_storage_areas (location_id, name)
SELECT id, 'Walk in Freezer' FROM public.locations
ON CONFLICT (location_id, name) DO NOTHING;

-- 2. Move items from the combined 'Walk in Cooler/Freezer' area to the new 'Walk in Cooler' area
-- We do this by matching the location_id and the old area name
UPDATE public.inventory_items
SET 
    storage_area_id = (SELECT id FROM public.inventory_storage_areas s WHERE s.location_id = public.inventory_items.location_id AND s.name = 'Walk in Cooler'),
    storage_area_name = 'Walk in Cooler'
WHERE storage_area_id IN (
    SELECT id FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler/Freezer'
);

-- 3. Finally, delete the combined area name from all locations
DELETE FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler/Freezer';
