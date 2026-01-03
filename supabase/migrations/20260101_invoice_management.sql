-- Invoice Management & Cost Analytics System
-- Migration: 20260101_invoice_management.sql

-- ============================================
-- VENDORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    account_number TEXT,
    payment_terms TEXT DEFAULT 'NET30', -- NET30, NET15, COD, etc.
    default_gl_code TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on vendor name per location
CREATE UNIQUE INDEX IF NOT EXISTS vendors_location_name_idx 
ON vendors(location_id, LOWER(name));

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    invoice_number TEXT,
    invoice_date DATE,
    due_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
    source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'scan', 'manual')),
    original_file_url TEXT,
    original_file_name TEXT,
    ocr_raw_data JSONB,
    processing_status TEXT DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'needs_review', 'failed')),
    processing_errors JSONB,
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS invoices_location_status_idx ON invoices(location_id, status);
CREATE INDEX IF NOT EXISTS invoices_vendor_idx ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS invoices_date_idx ON invoices(invoice_date DESC);

-- ============================================
-- INVOICE LINE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(12,3) DEFAULT 1,
    unit TEXT,
    unit_price DECIMAL(12,4) DEFAULT 0,
    extended_price DECIMAL(12,2) DEFAULT 0,
    gl_code TEXT,
    category TEXT, -- food, beverage, supplies, equipment, linens, etc.
    sub_category TEXT, -- beef, poultry, dairy, produce, etc.
    confidence_score DECIMAL(3,2) DEFAULT 1.00, -- AI confidence 0.00-1.00
    needs_review BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_line_items_invoice_idx ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_line_items_inventory_idx ON invoice_line_items(inventory_item_id);

-- ============================================
-- INGREDIENT PRICE HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ingredient_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    price_per_unit DECIMAL(12,4) NOT NULL,
    unit TEXT,
    recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_history_item_idx ON ingredient_price_history(inventory_item_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS price_history_vendor_idx ON ingredient_price_history(vendor_id);

-- ============================================
-- INVOICE APPROVALS (AUDIT LOG)
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'edited')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_approvals_invoice_idx ON invoice_approvals(invoice_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_approvals ENABLE ROW LEVEL SECURITY;

-- Vendors RLS: Users can access vendors at their location
DROP POLICY IF EXISTS vendors_select_policy ON vendors;
CREATE POLICY vendors_select_policy ON vendors FOR SELECT
USING (
    location_id IN (
        SELECT location_id FROM employees WHERE user_id = (select auth.uid()) AND is_active = true
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS vendors_insert_policy ON vendors;
CREATE POLICY vendors_insert_policy ON vendors FOR INSERT
WITH CHECK (
    location_id IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm', 'agm')
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS vendors_update_policy ON vendors;
CREATE POLICY vendors_update_policy ON vendors FOR UPDATE
USING (
    location_id IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm', 'agm')
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS vendors_delete_policy ON vendors;
CREATE POLICY vendors_delete_policy ON vendors FOR DELETE
USING (
    location_id IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm')
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

-- Invoices RLS: Same pattern
DROP POLICY IF EXISTS invoices_select_policy ON invoices;
CREATE POLICY invoices_select_policy ON invoices FOR SELECT
USING (
    location_id IN (
        SELECT location_id FROM employees WHERE user_id = (select auth.uid()) AND is_active = true
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS invoices_insert_policy ON invoices;
CREATE POLICY invoices_insert_policy ON invoices FOR INSERT
WITH CHECK (
    location_id IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm', 'agm')
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS invoices_update_policy ON invoices;
CREATE POLICY invoices_update_policy ON invoices FOR UPDATE
USING (
    location_id IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm', 'agm')
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS invoices_delete_policy ON invoices;
CREATE POLICY invoices_delete_policy ON invoices FOR DELETE
USING (
    location_id IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm')
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

-- Invoice Line Items RLS: Access through invoice
DROP POLICY IF EXISTS invoice_line_items_select_policy ON invoice_line_items;
CREATE POLICY invoice_line_items_select_policy ON invoice_line_items FOR SELECT
USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT location_id FROM employees WHERE user_id = (select auth.uid()) AND is_active = true
        )
    )
    OR
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT id FROM locations WHERE owner_id = (select auth.uid())
        )
    )
);

DROP POLICY IF EXISTS invoice_line_items_insert_policy ON invoice_line_items;
CREATE POLICY invoice_line_items_insert_policy ON invoice_line_items FOR INSERT
WITH CHECK (
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT location_id FROM employees 
            WHERE user_id = (select auth.uid()) AND is_active = true 
            AND role IN ('owner', 'manager', 'gm', 'agm')
        )
    )
    OR
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT id FROM locations WHERE owner_id = (select auth.uid())
        )
    )
);

DROP POLICY IF EXISTS invoice_line_items_update_policy ON invoice_line_items;
CREATE POLICY invoice_line_items_update_policy ON invoice_line_items FOR UPDATE
USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT location_id FROM employees 
            WHERE user_id = (select auth.uid()) AND is_active = true 
            AND role IN ('owner', 'manager', 'gm', 'agm')
        )
    )
    OR
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT id FROM locations WHERE owner_id = (select auth.uid())
        )
    )
);

DROP POLICY IF EXISTS invoice_line_items_delete_policy ON invoice_line_items;
CREATE POLICY invoice_line_items_delete_policy ON invoice_line_items FOR DELETE
USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT location_id FROM employees 
            WHERE user_id = (select auth.uid()) AND is_active = true 
            AND role IN ('owner', 'manager', 'gm')
        )
    )
    OR
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT id FROM locations WHERE owner_id = (select auth.uid())
        )
    )
);

-- Price History RLS
DROP POLICY IF EXISTS price_history_select_policy ON ingredient_price_history;
CREATE POLICY price_history_select_policy ON ingredient_price_history FOR SELECT
USING (
    location_id IN (
        SELECT location_id FROM employees WHERE user_id = (select auth.uid()) AND is_active = true
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS price_history_insert_policy ON ingredient_price_history;
CREATE POLICY price_history_insert_policy ON ingredient_price_history FOR INSERT
WITH CHECK (
    location_id IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm', 'agm')
    )
    OR
    location_id IN (
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

-- Invoice Approvals RLS
DROP POLICY IF EXISTS invoice_approvals_select_policy ON invoice_approvals;
CREATE POLICY invoice_approvals_select_policy ON invoice_approvals FOR SELECT
USING (
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT location_id FROM employees WHERE user_id = (select auth.uid()) AND is_active = true
        )
    )
    OR
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT id FROM locations WHERE owner_id = (select auth.uid())
        )
    )
);

DROP POLICY IF EXISTS invoice_approvals_insert_policy ON invoice_approvals;
CREATE POLICY invoice_approvals_insert_policy ON invoice_approvals FOR INSERT
WITH CHECK (
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT location_id FROM employees 
            WHERE user_id = (select auth.uid()) AND is_active = true 
            AND role IN ('owner', 'manager', 'gm', 'agm')
        )
    )
    OR
    invoice_id IN (
        SELECT id FROM invoices WHERE location_id IN (
            SELECT id FROM locations WHERE owner_id = (select auth.uid())
        )
    )
);

-- ============================================
-- TRIGGER: Update invoice totals on line item changes
-- ============================================
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE invoices
    SET 
        subtotal = COALESCE((
            SELECT SUM(extended_price) 
            FROM invoice_line_items 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0),
        updated_at = now()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS invoice_line_items_totals_trigger ON invoice_line_items;
CREATE TRIGGER invoice_line_items_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- ============================================
-- TRIGGER: Record price history on line item link to inventory
-- ============================================
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS TRIGGER AS $$
DECLARE
    v_location_id UUID;
    v_vendor_id UUID;
BEGIN
    -- Only trigger when inventory_item_id is set and unit_price is valid
    IF NEW.inventory_item_id IS NOT NULL AND NEW.unit_price > 0 THEN
        -- Get location and vendor from invoice
        SELECT i.location_id, i.vendor_id INTO v_location_id, v_vendor_id
        FROM invoices i WHERE i.id = NEW.invoice_id;
        
        -- Insert price history record
        INSERT INTO ingredient_price_history (
            inventory_item_id, vendor_id, invoice_id, location_id, price_per_unit, unit
        ) VALUES (
            NEW.inventory_item_id, v_vendor_id, NEW.invoice_id, v_location_id, NEW.unit_price, NEW.unit
        );
        
        -- Update inventory item's cost_per_unit to latest price
        UPDATE inventory_items
        SET cost_per_unit = NEW.unit_price, updated_at = now()
        WHERE id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS invoice_line_items_price_history_trigger ON invoice_line_items;
CREATE TRIGGER invoice_line_items_price_history_trigger
AFTER INSERT OR UPDATE ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION record_price_history();

-- ============================================
-- Create storage bucket for invoice files
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices', 
    'invoices', 
    false, 
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for invoices bucket
DROP POLICY IF EXISTS invoices_bucket_select ON storage.objects;
CREATE POLICY invoices_bucket_select ON storage.objects FOR SELECT
USING (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1]::uuid IN (
        SELECT location_id FROM employees WHERE user_id = (select auth.uid()) AND is_active = true
        UNION
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS invoices_bucket_insert ON storage.objects;
CREATE POLICY invoices_bucket_insert ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1]::uuid IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm', 'agm')
        UNION
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);

DROP POLICY IF EXISTS invoices_bucket_delete ON storage.objects;
CREATE POLICY invoices_bucket_delete ON storage.objects FOR DELETE
USING (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1]::uuid IN (
        SELECT location_id FROM employees 
        WHERE user_id = (select auth.uid()) AND is_active = true 
        AND role IN ('owner', 'manager', 'gm')
        UNION
        SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
);
