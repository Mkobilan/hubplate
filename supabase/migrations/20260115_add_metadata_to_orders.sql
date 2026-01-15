-- Migration 20260115_add_metadata_to_orders
-- Adds a metadata JSONB column to the orders table to support partial payments and other structured data.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update existing orders to have an empty object if null (though IF NOT EXISTS with DEFAULT handles new columns)
UPDATE public.orders SET metadata = '{}'::jsonb WHERE metadata IS NULL;
