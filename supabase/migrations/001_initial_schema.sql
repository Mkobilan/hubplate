-- HubPlate Database Schema Migration
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- RESTAURANTS & LOCATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  tax_rate DECIMAL(5,4) DEFAULT 0.0875,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMPLOYEES
-- ============================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'manager', 'server', 'cook', 'host')) NOT NULL,
  pin TEXT, -- 4-digit PIN for quick login
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENU CATEGORIES & ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2), -- For margin calculations
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_86d BOOLEAN DEFAULT false, -- 86'd = out of stock
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MODIFIERS (for customizations like "no onions")
-- ============================================

CREATE TABLE IF NOT EXISTS modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Temperature", "Toppings"
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Medium Rare", "Extra Cheese"
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_group_id UUID REFERENCES modifier_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, modifier_group_id)
);

-- ============================================
-- UPSELL RULES (for AI suggestions)
-- ============================================

CREATE TABLE IF NOT EXISTS upsell_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  suggested_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher = shown first
  conversion_rate DECIMAL(5,4) DEFAULT 0, -- Track success
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HAPPY HOURS
-- ============================================

CREATE TABLE IF NOT EXISTS happy_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  applies_to_category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  table_number TEXT,
  order_type TEXT CHECK (order_type IN ('dine_in', 'takeout', 'delivery')) DEFAULT 'dine_in',
  status TEXT CHECK (status IN ('open', 'sent', 'preparing', 'ready', 'served', 'paid', 'cancelled')) DEFAULT 'open',
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL NOT NULL,
  menu_item_name TEXT NOT NULL, -- Snapshot in case item deleted
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  modifiers JSONB, -- Store applied modifiers
  notes TEXT, -- Special instructions
  status TEXT CHECK (status IN ('pending', 'preparing', 'ready', 'served')) DEFAULT 'pending',
  is_upsell BOOLEAN DEFAULT false, -- Track upsell conversions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_menu_items_location ON menu_items(location_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_86d ON menu_items(location_id, is_86d) WHERE is_86d = true;
CREATE INDEX IF NOT EXISTS idx_orders_location ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(location_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE upsell_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for restaurants (owner access)
CREATE POLICY "Users can view own restaurants" ON restaurants
  FOR SELECT USING ((SELECT auth.uid()) = owner_id);
  
CREATE POLICY "Users can manage own restaurants" ON restaurants
  FOR ALL USING ((SELECT auth.uid()) = owner_id);

-- Policies for locations (through restaurant ownership)
CREATE POLICY "Users can view locations" ON locations
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can manage locations" ON locations
  FOR ALL USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = (SELECT auth.uid()))
  );

-- Policies for menu_items (through location -> restaurant)
CREATE POLICY "Users can view menu items" ON menu_items
  FOR SELECT USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN restaurants r ON l.restaurant_id = r.id 
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage menu items" ON menu_items
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN restaurants r ON l.restaurant_id = r.id 
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

-- Similar policies for other tables
CREATE POLICY "Users can view menu categories" ON menu_categories
  FOR SELECT USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN restaurants r ON l.restaurant_id = r.id 
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage menu categories" ON menu_categories
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN restaurants r ON l.restaurant_id = r.id 
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can view orders" ON orders
  FOR SELECT USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN restaurants r ON l.restaurant_id = r.id 
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage orders" ON orders
  FOR ALL USING (
    location_id IN (
      SELECT l.id FROM locations l 
      JOIN restaurants r ON l.restaurant_id = r.id 
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can view order items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN locations l ON o.location_id = l.id
      JOIN restaurants r ON l.restaurant_id = r.id
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage order items" ON order_items
  FOR ALL USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN locations l ON o.location_id = l.id
      JOIN restaurants r ON l.restaurant_id = r.id
      WHERE r.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for orders and order_items (for kitchen display)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check if Happy Hour is active
CREATE OR REPLACE FUNCTION is_happy_hour_active(p_location_id UUID, p_category_id UUID DEFAULT NULL)
RETURNS TABLE (
  is_active BOOLEAN,
  discount_type TEXT,
  discount_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true,
    hh.discount_type,
    hh.discount_value
  FROM happy_hours hh
  WHERE hh.location_id = p_location_id
    AND hh.is_active = true
    AND hh.day_of_week = EXTRACT(DOW FROM NOW())
    AND NOW()::TIME BETWEEN hh.start_time AND hh.end_time
    AND (hh.applies_to_category_id IS NULL OR hh.applies_to_category_id = p_category_id)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get upsell suggestions for an item
CREATE OR REPLACE FUNCTION get_upsell_suggestions(p_menu_item_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  suggested_item_id UUID,
  name TEXT,
  price DECIMAL,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.suggested_item_id,
    mi.name,
    mi.price,
    ur.priority
  FROM upsell_rules ur
  JOIN menu_items mi ON ur.suggested_item_id = mi.id
  WHERE ur.trigger_item_id = p_menu_item_id
    AND ur.is_active = true
    AND mi.is_available = true
    AND mi.is_86d = false
  ORDER BY ur.priority DESC, ur.conversion_rate DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
