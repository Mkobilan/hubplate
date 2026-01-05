-- Add delivery_fee column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.orders.delivery_fee IS 'Fee charged for delivery services.';
