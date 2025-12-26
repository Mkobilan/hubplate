-- Reservations Booking System
-- Supports multi-table reservations with configurable duration and colors

-- ============================================
-- RESERVATION SETTINGS (per location)
-- ============================================

CREATE TABLE IF NOT EXISTS public.reservation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    default_duration_minutes INTEGER DEFAULT 120 NOT NULL,
    reservation_color TEXT DEFAULT '#3b82f6' NOT NULL, -- Default blue
    advance_indicator_minutes INTEGER DEFAULT 15 NOT NULL, -- When to show reservation on seat map
    min_party_size INTEGER DEFAULT 1 NOT NULL,
    max_party_size INTEGER DEFAULT 20 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(location_id)
);

-- ============================================
-- RESERVATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    
    -- Customer Info
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    wants_loyalty_enrollment BOOLEAN DEFAULT FALSE,
    
    -- Reservation Details
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 120,
    party_size INTEGER NOT NULL DEFAULT 2,
    
    -- Special Accommodations (JSONB for flexibility)
    -- Example: {"allergies": "peanuts", "birthday": true, "wheelchair": true, "high_chair": 2, "notes": "Anniversary dinner"}
    special_accommodations JSONB DEFAULT '{}',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Just booked, needs confirmation
        'confirmed',    -- Confirmed by restaurant
        'seated',       -- Guest has arrived and seated
        'completed',    -- Finished dining
        'cancelled',    -- Cancelled by guest or restaurant
        'no_show'       -- Guest didn't show up
    )),
    
    -- Metadata
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- RESERVATION_TABLES (Junction for multi-table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.reservation_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.seating_tables(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(reservation_id, table_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_reservations_location ON public.reservations(location_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON public.reservations(location_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(location_id, status);
CREATE INDEX IF NOT EXISTS idx_reservation_tables_reservation ON public.reservation_tables(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_tables_table ON public.reservation_tables(table_id);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_tables ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - Reservation Settings
-- ============================================

-- Read: All employees at the location
CREATE POLICY "Employees can view reservation settings"
    ON public.reservation_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.location_id = reservation_settings.location_id
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = reservation_settings.location_id
            AND organizations.owner_id = auth.uid()
        )
    );

-- Write: Managers and Owners only
CREATE POLICY "Managers can manage reservation settings"
    ON public.reservation_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.location_id = reservation_settings.location_id
            AND employees.role IN ('owner', 'manager')
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = reservation_settings.location_id
            AND organizations.owner_id = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES - Reservations
-- ============================================

-- Read: All employees at the location
CREATE POLICY "Employees can view reservations"
    ON public.reservations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.location_id = reservations.location_id
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = reservations.location_id
            AND organizations.owner_id = auth.uid()
        )
    );

-- Write: Hosts, Managers, Owners can create/update reservations
CREATE POLICY "Staff can manage reservations"
    ON public.reservations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE employees.user_id = auth.uid()
            AND employees.location_id = reservations.location_id
            AND employees.role IN ('owner', 'manager', 'host', 'server')
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.organizations
            JOIN public.locations ON locations.organization_id = organizations.id
            WHERE locations.id = reservations.location_id
            AND organizations.owner_id = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES - Reservation Tables
-- ============================================

-- Read: Via reservation
CREATE POLICY "Employees can view reservation tables"
    ON public.reservation_tables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reservations
            JOIN public.employees ON employees.location_id = reservations.location_id
            WHERE reservations.id = reservation_tables.reservation_id
            AND employees.user_id = auth.uid()
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.reservations
            JOIN public.locations ON locations.id = reservations.location_id
            JOIN public.organizations ON organizations.id = locations.organization_id
            WHERE reservations.id = reservation_tables.reservation_id
            AND organizations.owner_id = auth.uid()
        )
    );

-- Write: Staff with reservation access
CREATE POLICY "Staff can manage reservation tables"
    ON public.reservation_tables FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.reservations
            JOIN public.employees ON employees.location_id = reservations.location_id
            WHERE reservations.id = reservation_tables.reservation_id
            AND employees.user_id = auth.uid()
            AND employees.role IN ('owner', 'manager', 'host', 'server')
            AND employees.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM public.reservations
            JOIN public.locations ON locations.id = reservations.location_id
            JOIN public.organizations ON organizations.id = locations.organization_id
            WHERE reservations.id = reservation_tables.reservation_id
            AND organizations.owner_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_reservation_settings_modtime
    BEFORE UPDATE ON public.reservation_settings
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER update_reservations_modtime
    BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservation_tables;

-- ============================================
-- INITIALIZE DEFAULT SETTINGS FOR EXISTING LOCATIONS
-- ============================================

INSERT INTO public.reservation_settings (location_id)
SELECT id FROM public.locations
ON CONFLICT (location_id) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Check Table Availability
-- ============================================

CREATE OR REPLACE FUNCTION public.check_table_availability(
    p_table_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_duration_minutes INTEGER,
    p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_end_time TIME;
    v_conflict_count INTEGER;
BEGIN
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM public.reservations r
    JOIN public.reservation_tables rt ON rt.reservation_id = r.id
    WHERE rt.table_id = p_table_id
      AND r.reservation_date = p_date
      AND r.status NOT IN ('cancelled', 'no_show', 'completed')
      AND (p_exclude_reservation_id IS NULL OR r.id != p_exclude_reservation_id)
      AND (
          -- Check for time overlap
          (r.reservation_time, r.reservation_time + (r.duration_minutes || ' minutes')::INTERVAL)
          OVERLAPS
          (p_start_time, v_end_time)
      );
    
    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;
