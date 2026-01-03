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
DROP POLICY IF EXISTS "Public can view locations with ordering enabled" ON public.locations;
CREATE POLICY "Public can view locations with ordering enabled"
ON public.locations FOR SELECT
TO anon, authenticated
USING (ordering_enabled = true);

-- 2. Menu Categories: Public can read if location has ordering enabled
-- NOTE: Table is named 'menu_categories' in this schema, not 'categories'
DROP POLICY IF EXISTS "Public can view categories for enabled locations" ON public.menu_categories;
CREATE POLICY "Public can view categories for enabled locations"
ON public.menu_categories FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE locations.id = menu_categories.location_id
    AND locations.ordering_enabled = true
  )
);

-- 3. Menu Items: Public can read if location has ordering enabled
DROP POLICY IF EXISTS "Public can view menu items for enabled locations" ON public.menu_items;
CREATE POLICY "Public can view menu items for enabled locations"
ON public.menu_items FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE locations.id = menu_items.location_id
    AND locations.ordering_enabled = true
  )
);

-- 4. Add Ons: Public can read if location has ordering enabled
DROP POLICY IF EXISTS "Public can view add_ons for enabled locations" ON public.add_ons;
CREATE POLICY "Public can view add_ons for enabled locations"
ON public.add_ons FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.locations
    WHERE locations.id = add_ons.location_id
    AND locations.ordering_enabled = true
  )
);

-- 5. Add On Assignments: Public can read if category allows it
DROP POLICY IF EXISTS "Public can view add_on_assignments" ON public.add_on_category_assignments;
CREATE POLICY "Public can view add_on_assignments"
ON public.add_on_category_assignments FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.menu_categories
    JOIN public.locations ON locations.id = menu_categories.location_id
    WHERE menu_categories.id = add_on_category_assignments.category_id
    AND locations.ordering_enabled = true
  )
);

-- STORAGE BUCKETS
-- Create buckets for logos and banners if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'logos'
DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');


-- Storage Policies for 'banners'
DROP POLICY IF EXISTS "Banners are publicly accessible" ON storage.objects;
CREATE POLICY "Banners are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Authenticated users can upload banners" ON storage.objects;
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners');

DROP POLICY IF EXISTS "Authenticated users can update banners" ON storage.objects;
CREATE POLICY "Authenticated users can update banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "Authenticated users can delete banners" ON storage.objects;
CREATE POLICY "Authenticated users can delete banners"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'banners');
