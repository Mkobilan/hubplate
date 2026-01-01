-- Migration: Server Performance Tracking
-- Adds columns to track which server is associated with reviews and loyalty signups.

-- 1. Add server_id to customer_feedback
ALTER TABLE public.customer_feedback ADD COLUMN IF NOT EXISTS server_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customer_feedback_server ON public.customer_feedback(server_id);

-- 2. Add loyalty_signup_server_id to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_signup_server_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_signup_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_signup_server ON public.customers(loyalty_signup_server_id);

-- 3. Add documentation
COMMENT ON COLUMN public.customer_feedback.server_id IS 'The server associated with the order this feedback is for.';
COMMENT ON COLUMN public.customers.loyalty_signup_server_id IS 'The server who signed up this customer for the loyalty program.';
COMMENT ON COLUMN public.customers.loyalty_signup_at IS 'The timestamp when the customer signed up for the loyalty program.';
