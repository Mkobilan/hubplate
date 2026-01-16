-- Add email column to waitlist table
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS customer_email TEXT;
