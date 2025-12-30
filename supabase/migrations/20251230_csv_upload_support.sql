-- CSV Employee Upload Feature: Custom Fields + AGM Role
-- Migration: 20251230_csv_upload_support

-- =============================================================================
-- ADD ASSISTANT GENERAL MANAGER ROLE
-- =============================================================================

-- Update employees role constraint to include 'agm' (Assistant General Manager)
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check 
    CHECK (role IN ('owner', 'manager', 'agm', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

-- Update employee_roles constraint as well
ALTER TABLE public.employee_roles DROP CONSTRAINT IF EXISTS employee_roles_role_check;
ALTER TABLE public.employee_roles ADD CONSTRAINT employee_roles_role_check 
    CHECK (role IN ('owner', 'manager', 'agm', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

-- Update employee_invites constraint
ALTER TABLE public.employee_invites DROP CONSTRAINT IF EXISTS employee_invites_role_check;
ALTER TABLE public.employee_invites ADD CONSTRAINT employee_invites_role_check 
    CHECK (role IN ('owner', 'manager', 'agm', 'server', 'bartender', 'cook', 'host', 'busser', 'dishwasher', 'driver', 'expo'));

-- =============================================================================
-- CUSTOM FIELDS FOR EMPLOYEES
-- =============================================================================

-- Custom field definitions per location (e.g., "address", "emergency_contact")
CREATE TABLE IF NOT EXISTS public.employee_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'phone', 'email')),
    is_required BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id, field_name)
);

-- Custom field values per employee
CREATE TABLE IF NOT EXISTS public.employee_custom_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    field_id UUID REFERENCES public.employee_custom_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, field_id)
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.employee_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_custom_values ENABLE ROW LEVEL SECURITY;

-- Custom fields: Location-based access
CREATE POLICY "Location access for employee_custom_fields" ON public.employee_custom_fields
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
        )
        OR location_id IN (
            SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid())
        )
    );

-- Custom values: Employee-based access
CREATE POLICY "Location access for employee_custom_values" ON public.employee_custom_values
    FOR ALL USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE location_id IN (
                SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
            )
        )
        OR employee_id IN (
            SELECT id FROM public.employees WHERE user_id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_employee_custom_fields_location ON public.employee_custom_fields(location_id);
CREATE INDEX IF NOT EXISTS idx_employee_custom_values_employee ON public.employee_custom_values(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_custom_values_field ON public.employee_custom_values(field_id);

-- =============================================================================
-- UPDATE TRIGGER FOR CUSTOM VALUES
-- =============================================================================

CREATE TRIGGER update_employee_custom_values_updated_at BEFORE UPDATE ON public.employee_custom_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
