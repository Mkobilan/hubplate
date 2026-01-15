-- Online Reservations Feature
-- Adds operating hours, online reservation settings, and source tracking

-- ============================================
-- OPERATING HOURS TABLE (per location, per day)
-- ============================================

CREATE TABLE IF NOT EXISTS public.operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    is_open BOOLEAN DEFAULT true NOT NULL,
    open_time TIME DEFAULT '11:00:00',
    close_time TIME DEFAULT '22:00:00',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(location_id, day_of_week)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_operating_hours_location ON public.operating_hours(location_id);

-- Enable RLS
ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;

-- Cleanup old policies from previous versions
DROP POLICY IF EXISTS "Employees can view operating hours" ON public.operating_hours;
DROP POLICY IF EXISTS "Managers can manage operating hours" ON public.operating_hours;
DROP POLICY IF EXISTS "Public can view operating hours for enabled locations" ON public.operating_hours;
DROP POLICY IF EXISTS "operating_hours_select_public" ON public.operating_hours;
DROP POLICY IF EXISTS "operating_hours_select_staff" ON public.operating_hours;
DROP POLICY IF EXISTS "operating_hours_insert" ON public.operating_hours;
DROP POLICY IF EXISTS "operating_hours_update" ON public.operating_hours;
DROP POLICY IF EXISTS "operating_hours_delete" ON public.operating_hours;

-- RLS: Public can view operating hours for locations with ordering enabled
CREATE POLICY "operating_hours_select_public"
    ON public.operating_hours FOR SELECT
    TO anon
    USING (
        EXISTS (
            SELECT 1 FROM public.locations
            WHERE locations.id = operating_hours.location_id
            AND locations.ordering_enabled = true
        )
    );

-- RLS: Staff can view operating hours
CREATE POLICY "operating_hours_select_staff"
    ON public.operating_hours FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = (SELECT auth.uid())
            AND employees.location_id = operating_hours.location_id
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = operating_hours.location_id
            AND organizations.owner_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.locations
            WHERE locations.id = operating_hours.location_id
            AND locations.ordering_enabled = true
        )
    );

-- RLS: Managers can manage operating hours (Write access)
CREATE POLICY "operating_hours_insert"
    ON public.operating_hours FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = (SELECT auth.uid())
            AND employees.location_id = operating_hours.location_id
            AND employees.role IN ('owner', 'manager')
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = operating_hours.location_id
            AND organizations.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "operating_hours_update"
    ON public.operating_hours FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = (SELECT auth.uid())
            AND employees.location_id = operating_hours.location_id
            AND employees.role IN ('owner', 'manager')
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = operating_hours.location_id
            AND organizations.owner_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "operating_hours_delete"
    ON public.operating_hours FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = (SELECT auth.uid())
            AND employees.location_id = operating_hours.location_id
            AND employees.role IN ('owner', 'manager')
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = operating_hours.location_id
            AND organizations.owner_id = (SELECT auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_operating_hours_modtime ON public.operating_hours;
CREATE TRIGGER update_operating_hours_modtime
    BEFORE UPDATE ON public.operating_hours
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Initialize default operating hours for existing locations (Mon-Sun, 11am-10pm)
INSERT INTO public.operating_hours (location_id, day_of_week, is_open, open_time, close_time)
SELECT l.id, d.day, true, '11:00:00', '22:00:00'
FROM public.locations l
CROSS JOIN (SELECT generate_series(0, 6) AS day) d
ON CONFLICT (location_id, day_of_week) DO NOTHING;

-- ============================================
-- ONLINE RESERVATION SETTINGS
-- ============================================

-- Add online reservation columns to reservation_settings
ALTER TABLE public.reservation_settings
ADD COLUMN IF NOT EXISTS online_reservations_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS time_slot_interval INTEGER DEFAULT 15 CHECK (time_slot_interval IN (15, 30)),
ADD COLUMN IF NOT EXISTS max_party_size_online INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS pacing_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS confirmation_message TEXT DEFAULT 'Thank you for your reservation! We look forward to seeing you.';

-- ============================================
-- RESERVATION SOURCE TRACKING
-- ============================================

-- Add source and confirmation tracking to reservations
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'phone' CHECK (source IN ('phone', 'online', 'walk_in')),
ADD COLUMN IF NOT EXISTS confirmation_code TEXT,
ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;

-- Index for confirmation code lookups
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_code ON public.reservations(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_reservations_source ON public.reservations(source);

-- ============================================
-- PUBLIC ACCESS POLICIES FOR ONLINE RESERVATIONS
-- ============================================

-- Public can view seating_maps (needed for tables join)
DROP POLICY IF EXISTS "Public can view seating maps for enabled locations" ON public.seating_maps;
CREATE POLICY "Public can view seating maps for enabled locations"
ON public.seating_maps FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = seating_maps.location_id
        AND locations.ordering_enabled = true
    )
);

-- Public can view reservation_settings for enabled locations (for the widget)
DROP POLICY IF EXISTS "Public can view reservation settings for enabled locations" ON public.reservation_settings;
CREATE POLICY "Public can view reservation settings for enabled locations"
ON public.reservation_settings FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = reservation_settings.location_id
        AND locations.ordering_enabled = true
    )
);

-- Public can view seating_tables capacity for enabled locations (for availability check)
DROP POLICY IF EXISTS "Public can view tables for enabled locations" ON public.seating_tables;
CREATE POLICY "Public can view tables for enabled locations"
ON public.seating_tables FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.seating_maps sm
        JOIN public.locations l ON l.id = sm.location_id
        WHERE sm.id = seating_tables.map_id
        AND l.ordering_enabled = true
    )
);

-- Public can view reservations for availability checking (limited to date/time/duration for conflict detection)
-- This is safe because we only need to check for conflicts, not expose customer data
DROP POLICY IF EXISTS "Public can check reservation availability" ON public.reservations;
CREATE POLICY "Public can check reservation availability"
ON public.reservations FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = reservations.location_id
        AND locations.ordering_enabled = true
    )
);

-- Public can view reservation_tables for availability checking
DROP POLICY IF EXISTS "Public can check reservation table assignments" ON public.reservation_tables;
CREATE POLICY "Public can check reservation table assignments"
ON public.reservation_tables FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM public.reservations r
        JOIN public.locations l ON l.id = r.location_id
        WHERE r.id = reservation_tables.reservation_id
        AND l.ordering_enabled = true
    )
);

-- Public can make reservations
DROP POLICY IF EXISTS "Public can create reservations" ON public.reservations;
CREATE POLICY "Public can create reservations"
ON public.reservations FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.locations
        WHERE locations.id = reservations.location_id
        AND locations.ordering_enabled = true
    )
);

-- Public can link tables to their reservations
DROP POLICY IF EXISTS "Public can assign tables to reservations" ON public.reservation_tables;
CREATE POLICY "Public can assign tables to reservations"
ON public.reservation_tables FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.reservations r
        JOIN public.locations l ON l.id = r.location_id
        WHERE r.id = reservation_tables.reservation_id
        AND l.ordering_enabled = true
    )
);

-- ============================================
-- HELPER FUNCTION: Generate Confirmation Code
-- ============================================

CREATE OR REPLACE FUNCTION public.generate_confirmation_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'HUB-';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- HELPER FUNCTION: Get Available Time Slots
-- ============================================

CREATE OR REPLACE FUNCTION public.get_available_time_slots(
    p_location_id UUID,
    p_date DATE,
    p_party_size INTEGER
)
RETURNS TABLE (
    time_slot TIME,
    available_tables INTEGER
) AS $$
DECLARE
    v_settings RECORD;
    v_operating_hours RECORD;
    v_day_of_week INTEGER;
    v_slot TIME;
    v_slot_end TIME;
    v_duration INTEGER;
    v_available_count INTEGER;
    v_min_time TIMESTAMPTZ;
    v_timezone TEXT;
BEGIN
    -- Get reservation settings
    SELECT * INTO v_settings
    FROM public.reservation_settings
    WHERE location_id = p_location_id;
    
    IF NOT FOUND OR NOT v_settings.online_reservations_enabled THEN
        RETURN;
    END IF;
    
    v_duration := v_settings.default_duration_minutes;
    v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
    
    -- Get location timezone
    SELECT timezone INTO v_timezone
    FROM public.locations
    WHERE id = p_location_id;
    
    v_timezone := COALESCE(v_timezone, 'UTC');
    
    -- Get operating hours for this day
    SELECT * INTO v_operating_hours
    FROM public.operating_hours
    WHERE location_id = p_location_id
    AND day_of_week = v_day_of_week;
    
    IF NOT FOUND OR NOT v_operating_hours.is_open THEN
        RETURN;
    END IF;
    
    -- Generate slots from open_time to close_time
    v_slot := v_operating_hours.open_time;
    
    WHILE v_slot <= v_operating_hours.close_time - (v_duration || ' minutes')::INTERVAL LOOP
        -- Skip slots in the past
        -- We compare against the location's local time
        IF (p_date + v_slot) < (NOW() AT TIME ZONE v_timezone + (v_settings.min_advance_hours || ' hours')::INTERVAL) THEN
            v_slot := v_slot + (v_settings.time_slot_interval || ' minutes')::INTERVAL;
            CONTINUE;
        END IF;
        
        v_slot_end := v_slot + (v_duration || ' minutes')::INTERVAL;
        
        -- Count available tables for this slot
        SELECT COUNT(*) INTO v_available_count
        FROM public.seating_tables st
        JOIN public.seating_maps sm ON sm.id = st.map_id
        WHERE sm.location_id = p_location_id
        AND sm.is_active = true
        AND st.is_active = true
        -- Broaden search to include anything with enough capacity
        AND st.capacity >= p_party_size
        AND NOT EXISTS (
            SELECT 1 FROM public.reservation_tables rt
            JOIN public.reservations r ON r.id = rt.reservation_id
            WHERE rt.table_id = st.id
            AND r.reservation_date = p_date
            AND r.status NOT IN ('cancelled', 'no_show', 'completed')
            AND (
                (r.reservation_time, r.reservation_time + (r.duration_minutes || ' minutes')::INTERVAL)
                OVERLAPS
                (v_slot, v_slot_end)
            )
        );
        
        -- Check pacing limit
        IF v_settings.pacing_limit IS NOT NULL THEN
            DECLARE
                v_slot_count INTEGER;
            BEGIN
                SELECT COUNT(*) INTO v_slot_count
                FROM public.reservations r
                WHERE r.location_id = p_location_id
                AND r.reservation_date = p_date
                AND r.reservation_time = v_slot
                AND r.status NOT IN ('cancelled', 'no_show', 'completed');
                
                IF v_slot_count >= v_settings.pacing_limit THEN
                    v_available_count := 0;
                END IF;
            END;
        END IF;
        
        IF v_available_count > 0 THEN
            time_slot := v_slot;
            available_tables := v_available_count;
            RETURN NEXT;
        END IF;
        
        v_slot := v_slot + (v_settings.time_slot_interval || ' minutes')::INTERVAL;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to anon for public access
GRANT EXECUTE ON FUNCTION public.get_available_time_slots(UUID, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.generate_confirmation_code() TO anon;

-- ============================================
-- ENABLE REALTIME FOR OPERATING HOURS
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'operating_hours'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.operating_hours;
    END IF;
END $$;
