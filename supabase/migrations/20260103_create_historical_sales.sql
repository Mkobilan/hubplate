-- Create historical_sales table for analytics import
CREATE TABLE IF NOT EXISTS historical_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
    sale_date DATE NOT NULL,
    gross_sales DECIMAL(12,2) DEFAULT 0,
    net_sales DECIMAL(12,2) DEFAULT 0,
    tax_collected DECIMAL(12,2) DEFAULT 0,
    tips_collected DECIMAL(12,2) DEFAULT 0,
    comp_amount DECIMAL(12,2) DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    source_system TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_historical_sales_location_date ON historical_sales(location_id, sale_date);

-- RLS
ALTER TABLE historical_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view historical sales" ON historical_sales;
CREATE POLICY "Users can view historical sales" ON historical_sales
  FOR SELECT USING (
    location_id IN (
      SELECT location_id FROM employees WHERE user_id = (select auth.uid())
      UNION
      SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage historical sales" ON historical_sales;
CREATE POLICY "Users can manage historical sales" ON historical_sales
  FOR ALL USING (
    location_id IN (
      SELECT location_id FROM employees WHERE user_id = (select auth.uid()) AND role IN ('owner', 'manager', 'gm')
      UNION
      SELECT id FROM locations WHERE owner_id = (select auth.uid())
    )
  );
