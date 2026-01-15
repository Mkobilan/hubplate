-- Backfill paid_at for existing paid orders
-- This ensures payroll can correctly query tips by date range

-- Set paid_at to completed_at for any paid orders that don't have paid_at set
UPDATE public.orders
SET paid_at = completed_at
WHERE payment_status = 'paid'
  AND paid_at IS NULL
  AND completed_at IS NOT NULL;

-- For paid orders without completed_at, use created_at as a fallback
UPDATE public.orders
SET paid_at = created_at
WHERE payment_status = 'paid'
  AND paid_at IS NULL
  AND completed_at IS NULL;
