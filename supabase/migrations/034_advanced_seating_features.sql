-- Migration 034: Advanced Seating & Seat-Level Ordering

-- 1. Update seating_tables with new object types and shapes
DO $$ 
BEGIN 
    -- We can't easily update a CHECK constraint without dropping and recreating it
    ALTER TABLE public.seating_tables DROP CONSTRAINT IF EXISTS seating_tables_shape_check;
    ALTER TABLE public.seating_tables ADD CONSTRAINT seating_tables_shape_check 
        CHECK (shape IN ('rect', 'circle', 'oval', 'booth', 'chair', 'door', 'wall'));
END $$;

-- 2. Add object_type to distinguish between interactive tables and decor
ALTER TABLE public.seating_tables ADD COLUMN IF NOT EXISTS object_type TEXT DEFAULT 'table' 
    CHECK (object_type IN ('table', 'structure', 'seat'));

-- 3. Add seat_number to order_items to support pivoted service
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seat_number INTEGER DEFAULT 1;

-- 4. Update existing capacity logic: Doors and Walls should have 0 capacity by default
UPDATE public.seating_tables SET capacity = 0 WHERE shape IN ('door', 'wall');
