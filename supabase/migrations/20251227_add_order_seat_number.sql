-- Migration: Add seat_number to orders table
-- This allows identifying specifically which seat a check belongs to, especially after a split.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seat_number INTEGER;

COMMENT ON COLUMN public.orders.seat_number IS 'The primary seat number associated with this check.';
