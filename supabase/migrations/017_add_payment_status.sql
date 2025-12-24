-- Add payment_status column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Add comment for clarity
COMMENT ON COLUMN orders.payment_status IS 'Payment status: unpaid, pending, paid, failed';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for tracking';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
