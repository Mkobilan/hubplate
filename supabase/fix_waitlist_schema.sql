-- CONSOLIDATED WAITLIST SCHEMA FIX
-- Run this in your Supabase SQL Editor to ensure the table and columns exist

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    party_size INTEGER DEFAULT 2,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'seated', 'cancelled', 'no_show', 'completed')),
    notes TEXT,
    estimated_wait_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    seated_at TIMESTAMPTZ
);

-- 2. Add any missing columns (in case the table existed but was old)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='waitlist' AND column_name='table_id') THEN
        ALTER TABLE public.waitlist ADD COLUMN table_id UUID REFERENCES public.seating_tables(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='waitlist' AND column_name='table_label') THEN
        ALTER TABLE public.waitlist ADD COLUMN table_label TEXT;
    END IF;

    -- Update constraint
    ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_status_check;
    ALTER TABLE public.waitlist ADD CONSTRAINT waitlist_status_check CHECK (status IN ('waiting', 'seated', 'cancelled', 'no_show', 'completed'));
END $$;

-- 3. Ensure RLS is enabled and policy exists
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waitlist' AND policyname = 'Location access for waitlist') THEN
        CREATE POLICY "Location access for waitlist" ON public.waitlist
            FOR ALL USING (
                location_id IN (
                    SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid()) OR 
                    id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
                )
            );
    END IF;
END $$;

-- 4. Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
