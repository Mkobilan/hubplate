
-- Migration: Update order status constraint to include all app-used statuses
-- This ensures 'in_progress' and 'completed' are officially supported in the DB.

-- 1. Drop the old constraint if it exists (it was named 'orders_status_check' in the initial schema)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Add the comprehensive constraint
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('open', 'pending', 'sent', 'preparing', 'in_progress', 'ready', 'served', 'completed', 'paid', 'cancelled'));

-- 3. Ensure 'paid' status in payment_status is also correct (initial schema had it)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'partially_paid', 'failed'));

-- 4. Set comments to reflect the new allowed values
COMMENT ON COLUMN orders.status IS 'Order execution status: open, pending (new), sent, preparing, in_progress, ready, served, completed, paid (legacy), cancelled';
COMMENT ON COLUMN orders.payment_status IS 'Financial status: unpaid, pending, paid, partially_paid, failed';
