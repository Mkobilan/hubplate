-- Add table assignment to waitlist
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES public.seating_tables(id) ON DELETE SET NULL;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS table_label TEXT;
