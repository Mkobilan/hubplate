-- Add Dynamic Pricing Rules table
-- Supports both discounts (Happy Hour) and surge pricing

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT CHECK (rule_type IN ('discount', 'surge')) NOT NULL,
  days_of_week INTEGER[] NOT NULL, -- 0=Sunday, 1=Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL,
  category_ids UUID[] DEFAULT '{}', -- Array of menu_category IDs. Empty means all categories.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view pricing rules" ON pricing_rules
  FOR SELECT USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN organizations o ON l.organization_id = o.id 
      WHERE o.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage pricing rules" ON pricing_rules
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN organizations o ON l.organization_id = o.id 
      WHERE o.owner_id = (SELECT auth.uid())
    )
  );

-- Function to get active pricing rules for a location
CREATE OR REPLACE FUNCTION get_active_pricing_rules(p_location_id UUID)
RETURNS SETOF pricing_rules AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM pricing_rules
  WHERE location_id = p_location_id
    AND is_active = true
    AND (EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE (SELECT timezone FROM locations WHERE id = p_location_id)))::INTEGER = ANY(days_of_week))
    AND (CURRENT_TIMESTAMP AT TIME ZONE (SELECT timezone FROM locations WHERE id = p_location_id))::TIME BETWEEN start_time AND end_time;
END;
$$ LANGUAGE plpgsql;
