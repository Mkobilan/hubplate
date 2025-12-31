-- Migration to add onboarding and subscription tracking
-- Path: c/hubplate/supabase/migrations/20251230_onboarding_and_subscriptions.sql

-- Add columns to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add onboarding flag to employees
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS has_completed_tour BOOLEAN DEFAULT false;

-- Create an index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON public.organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations(subscription_status);
