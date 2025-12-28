-- Migration 037: Add Admin PIN to Organizations
-- Adds a master PIN for organization owners to log in to any terminal.

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS admin_pin text;

-- Add check constraint for 4-6 digits, similar to employees table
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_admin_pin_check CHECK (admin_pin ~ '^\d{4}$|^\d{6}$');
