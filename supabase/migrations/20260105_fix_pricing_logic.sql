-- Fix RLS for pricing_rules
-- Allow public select so guest menu and all employees can see rules
DROP POLICY IF EXISTS "Users can view pricing rules" ON pricing_rules;
CREATE POLICY "Public can view pricing rules" ON pricing_rules
  FOR SELECT USING (true);

-- Allow managing pricing rules for owners and managers of the location
DROP POLICY IF EXISTS "Users can manage pricing rules" ON pricing_rules;
CREATE POLICY "Managers can manage pricing rules" ON pricing_rules
  FOR ALL USING (
    location_id IN (
      SELECT e.location_id FROM employees e 
      WHERE e.user_id = auth.uid() 
      AND e.role IN ('owner', 'manager', 'gm', 'agm')
    )
  );

-- Also allow owners of organizations
CREATE POLICY "Owners can manage pricing rules" ON pricing_rules
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN organizations o ON l.organization_id = o.id 
      WHERE o.owner_id = auth.uid()
    )
  );

-- Fix get_active_pricing_rules function
-- Ensure it correctly handles the timezone and uses CURRENT_TIMESTAMP correctly
CREATE OR REPLACE FUNCTION get_active_pricing_rules(p_location_id UUID)
RETURNS SETOF pricing_rules AS $$
DECLARE
  l_timezone TEXT;
BEGIN
  -- Get location timezone, fallback to UTC if not set
  SELECT COALESCE(timezone, 'UTC') INTO l_timezone FROM locations WHERE id = p_location_id;
  
  RETURN QUERY
  SELECT *
  FROM pricing_rules
  WHERE location_id = p_location_id
    AND is_active = true
    AND (EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE l_timezone))::INTEGER = ANY(days_of_week))
    -- Compare time part correctly
    AND (CURRENT_TIMESTAMP AT TIME ZONE l_timezone)::TIME BETWEEN start_time AND end_time;
END;
$$ LANGUAGE plpgsql;
