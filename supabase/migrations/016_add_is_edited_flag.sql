-- Add is_edited column to orders and order_items
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN orders.is_edited IS 'Flag to indicate if the order has been modified after initial submission';
COMMENT ON COLUMN order_items.is_edited IS 'Flag to indicate if this specific item has been modified after being sent to the kitchen';
