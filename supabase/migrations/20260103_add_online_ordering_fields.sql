-- Add online ordering fields to locations table
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#f97316', -- Default orange
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS ordering_enabled boolean DEFAULT false;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_locations_slug ON public.locations(slug);

-- RLS POLICIES FOR PUBLIC ACCESS
-- NOTE: We use "ordering_enabled = true" to ensure only active online ordering locations are public.

-- 1. Locations: Public can read basic info if ordering is enabled
CREATE POLICY "Public can view locations with ordering enabled"
ON public.locations FOR SELECT
TO anon, authenticated
USING (ordering_enabled = true);

-- 2. Categories: Public can read if location has ordering enabled
CREATE POLICY "Public can view categories for enabled locations"
ON public.categories FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE locations.id = categories.location_id
    AND locations.ordering_enabled = true
  )
);

-- 3. Menu Items: Public can read if location has ordering enabled
CREATE POLICY "Public can view menu items for enabled locations"
ON public.menu_items FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.categories
    JOIN public.locations ON locations.id = categories.location_id
    WHERE categories.id = menu_items.category_id
    AND locations.ordering_enabled = true
  )
);

-- 4. Modifier Groups: Public can read if location has ordering enabled
CREATE POLICY "Public can view modifier groups for enabled locations"
ON public.modifier_groups FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE locations.id = modifier_groups.location_id
    AND locations.ordering_enabled = true
  )
);

-- 5. Modifiers: Public can read if user can see the group
CREATE POLICY "Public can view modifiers for enabled locations"
ON public.modifiers FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.modifier_groups
    JOIN public.locations ON locations.id = modifier_groups.location_id
    WHERE modifier_groups.id = modifiers.group_id
    AND locations.ordering_enabled = true
  )
);
