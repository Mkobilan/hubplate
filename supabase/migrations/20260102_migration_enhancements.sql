-- Data Migration & Loyalty Enhancements
-- Migration: 20260102_migration_enhancements.sql

-- ============================================
-- GIFT CARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL,
    current_balance DECIMAL(12,2) DEFAULT 0 NOT NULL,
    original_balance DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id, card_number)
);

-- Index for fast lookup by card number at a location
CREATE INDEX IF NOT EXISTS gift_cards_lookup_idx ON public.gift_cards(location_id, card_number);

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Location access for gift_cards" ON public.gift_cards
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
            OR id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        )
    );

-- ============================================
-- HISTORICAL SALES TABLE
-- ============================================
-- Used to store aggregated sales data from previous systems
CREATE TABLE IF NOT EXISTS public.historical_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    gross_sales DECIMAL(12,2) DEFAULT 0,
    net_sales DECIMAL(12,2) DEFAULT 0,
    tax_collected DECIMAL(12,2) DEFAULT 0,
    tips_collected DECIMAL(12,2) DEFAULT 0,
    comp_amount DECIMAL(12,2) DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    source_system TEXT, -- 'Toast', 'Aloha', etc.
    metadata JSONB, -- For storing raw row data if needed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS historical_sales_date_idx ON public.historical_sales(location_id, sale_date DESC);

-- Enable RLS
ALTER TABLE public.historical_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Location access for historical_sales" ON public.historical_sales
    FOR ALL USING (
        location_id IN (
            SELECT id FROM public.locations WHERE owner_id = (SELECT auth.uid())
            OR id IN (SELECT location_id FROM public.employees WHERE user_id = (SELECT auth.uid()))
        )
    );

-- ============================================
-- UPDATE MENU ITEMS FOR MIGRATION
-- ============================================
-- Add station mapping if not exists
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS legacy_station_name TEXT;

-- Add metadata to customers for custom migration fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add external_id and YTD payroll fields to employees for payroll/POS linking
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ytd_gross DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ytd_net DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ytd_tax DECIMAL(12,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_employees_external_id ON public.employees(external_id);
