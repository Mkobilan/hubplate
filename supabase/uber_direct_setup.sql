-- Uber Direct Integration Schema Update
-- Created: 2026-01-04

-- Step 1: Update the locations table with Uber Direct settings
-- uber_organization_id: Stores the unique identifier returned by Uber's Organizations API.
-- delivery_enabled: Internal toggle to turn on/off the delivery fulfillment engine.
-- delivery_radius: The maximum distance (in miles) the restaurant is willing to deliver.
ALTER TABLE public.locations 
    ADD COLUMN IF NOT EXISTS uber_organization_id TEXT,
    ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS delivery_radius FLOAT8 DEFAULT 5.0;

-- Step 2: Update the orders table to track delivery details
-- uber_delivery_id: Stores the Uber delivery ID for tracking and status updates.
-- delivery_fee: Stores the delivery cost returned by the Uber Quote API.
ALTER TABLE public.orders 
    ADD COLUMN IF NOT EXISTS uber_delivery_id TEXT,
    ADD COLUMN IF NOT EXISTS uber_quote_id TEXT,
    ADD COLUMN IF NOT EXISTS delivery_address TEXT,
    ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS customer_name TEXT,
    ADD COLUMN IF NOT EXISTS customer_email TEXT,
    ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Optional: Add comments to help documentation in the Supabase UI
COMMENT ON COLUMN public.locations.uber_organization_id IS 'The unique organization ID from Uber Direct for this location';
COMMENT ON COLUMN public.locations.delivery_enabled IS 'Toggle to enable/disable Uber Direct fulfillment';
COMMENT ON COLUMN public.locations.delivery_radius IS 'Maximum delivery distance in miles';
COMMENT ON COLUMN public.orders.uber_delivery_id IS 'The tracking ID for the Uber Direct delivery';
COMMENT ON COLUMN public.orders.delivery_fee IS 'The fee charged by Uber for this specific delivery';
