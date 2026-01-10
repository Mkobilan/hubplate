-- Migration: Pour Tracking Links
-- Adds columns to link pours to specific orders and order items

ALTER TABLE pours 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_item_ref TEXT;

-- Create an index for faster lookups by order_id
CREATE INDEX IF NOT EXISTS idx_pours_order_id ON pours(order_id);
