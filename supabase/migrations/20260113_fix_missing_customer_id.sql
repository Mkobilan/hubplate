-- Migration to add missing customer_id column to orders table
-- This column is required for linking orders to customer profiles and loyalty points tracking.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') THEN 
        ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added customer_id column to orders table';
    END IF; 
END $$;

-- Add index for performance optimization
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
