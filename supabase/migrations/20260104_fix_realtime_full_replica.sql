-- Migration: Enable Full Replica Identity for Orders
-- Description: Required for correct Realtime RLS filtering on UPDATE events where filter columns (location_id) don't change.

-- 1. Set Replica Identity to FULL
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- 2. Ensure it is in the publication (Idempotent approach)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END $$;
