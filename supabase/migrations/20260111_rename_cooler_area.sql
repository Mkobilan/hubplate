-- 1. Move items from 'Walk in Cooler/Freezer' to 'Walk in Cooler' if both exist
UPDATE public.inventory_items
SET 
    storage_area_id = (SELECT id FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler' LIMIT 1),
    storage_area_name = 'Walk in Cooler'
WHERE storage_area_id IN (SELECT id FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler/Freezer')
AND EXISTS (SELECT 1 FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler');

-- 2. Rename 'Walk in Cooler/Freezer' to 'Walk in Cooler' for locations that DON'T have a 'Walk in Cooler' yet
UPDATE public.inventory_storage_areas
SET name = 'Walk in Cooler'
WHERE name = 'Walk in Cooler/Freezer'
AND location_id NOT IN (SELECT location_id FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler');

-- 3. Delete any remaining 'Walk in Cooler/Freezer' areas (they should be empty now)
DELETE FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler/Freezer';

-- 4. Ensure all items have the updated name in the denormalized column
UPDATE public.inventory_items
SET storage_area_name = 'Walk in Cooler'
WHERE storage_area_id IN (SELECT id FROM public.inventory_storage_areas WHERE name = 'Walk in Cooler');
