-- Update waitlist status check to include 'completed'
ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_status_check;
ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_status_check CHECK (status IN ('waiting', 'seated', 'cancelled', 'no_show', 'completed'));
