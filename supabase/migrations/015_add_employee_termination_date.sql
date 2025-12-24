-- Migration 015: Add Termination Date
-- Adds termination_date to employees table to track when employment ends

ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS termination_date DATE;
