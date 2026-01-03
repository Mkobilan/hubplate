-- Add metadata to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to gift_cards
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add metadata to menu_categories
ALTER TABLE public.menu_categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add unique constraint to vendors for (location_id, name) to support upsert
-- First, drop the index if we want to replace it with a constraint, or just add the constraint
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_location_id_name_key;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_location_id_name_key UNIQUE (location_id, name);
