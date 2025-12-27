-- Migration to support CSV Import and Custom Fields
-- Adds unique constraint to prevent duplicate inventory items per location
-- Adds metadata column for custom CSV fields

-- 1. Add unique constraint for upsert (safely)
ALTER TABLE public.inventory_items 
DROP CONSTRAINT IF EXISTS inventory_items_location_id_name_key;

ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_location_id_name_key UNIQUE (location_id, name);

-- 2. Add metadata column for extra fields
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

