-- Final Ensure Loyalty Columns on Orders
DO $$ 
BEGIN 
    -- customer_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') THEN 
        ALTER TABLE "orders" ADD COLUMN "customer_id" UUID REFERENCES "customers"("id") ON DELETE SET NULL;
    END IF; 

    -- customer_phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN 
        ALTER TABLE "orders" ADD COLUMN "customer_phone" TEXT;
    END IF;

    -- customer_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email') THEN 
        ALTER TABLE "orders" ADD COLUMN "customer_email" TEXT;
    END IF;

    -- customer_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN 
        ALTER TABLE "orders" ADD COLUMN "customer_name" TEXT;
    END IF;

    -- discount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount') THEN 
        ALTER TABLE "orders" ADD COLUMN "discount" NUMERIC(10,2) DEFAULT 0;
    END IF;

    -- points_redeemed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'points_redeemed') THEN 
        ALTER TABLE "orders" ADD COLUMN "points_redeemed" INTEGER DEFAULT 0;
    END IF;
END $$;

-- Ensure indexes
CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_orders_customer_phone" ON "orders" ("customer_phone");
