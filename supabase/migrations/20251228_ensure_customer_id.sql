-- Add customer_id to orders if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') THEN 
        ALTER TABLE "orders" ADD COLUMN "customer_id" UUID REFERENCES "customers"("id");
    END IF; 
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customer_id");

-- Update recommendations page logic requires fetching orders, so let's verify if we need any other columns?
-- The user mentioned "visits" vs "total_visits". This is a column name mismatch in the code, not necessarily DB schema missing.
