-- Migration: Recipes and Pour Tracking
-- Adds support for complex recipes and manual pour tracking for bars/restaurants

-- ============================================
-- RECIPES
-- ============================================

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT, -- Preparation steps
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredients within a recipe
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  quantity_used DECIMAL(10,4) NOT NULL, -- e.g., 1.5, 0.25 (oz, units, etc.)
  unit TEXT, -- Snapshot of the unit at time of creation, e.g., 'oz', 'ml'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link recipes to menu items (Many-to-Many)
CREATE TABLE IF NOT EXISTS recipe_menu_items (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (recipe_id, menu_item_id)
);

-- ============================================
-- POUR TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS pours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL, -- Can be a specific recipe
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL, -- Or just a single item pour
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  quantity DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL,
  pour_type TEXT CHECK (pour_type IN ('standard', 'double', 'shot', 'manual')) DEFAULT 'standard',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pours ENABLE ROW LEVEL SECURITY;

-- Recipes Policies
CREATE POLICY "Users can view recipes for their locations" ON recipes
  FOR SELECT USING (
    location_id IN (
      SELECT id FROM public.locations 
      WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
    )
  );

CREATE POLICY "Users can manage recipes for their locations" ON recipes
  FOR ALL USING (
    location_id IN (
      SELECT id FROM public.locations 
      WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
    )
  );

-- Recipe Ingredients Policies
CREATE POLICY "Users can view recipe ingredients" ON recipe_ingredients
  FOR SELECT USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE location_id IN (
        SELECT id FROM public.locations 
        WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
      )
    )
  );

CREATE POLICY "Users can manage recipe ingredients" ON recipe_ingredients
  FOR ALL USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE location_id IN (
        SELECT id FROM public.locations 
        WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
      )
    )
  );

-- Recipe Menu Items Policies
CREATE POLICY "Users can view recipe menu items" ON recipe_menu_items
  FOR SELECT USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE location_id IN (
        SELECT id FROM public.locations 
        WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
      )
    )
  );

CREATE POLICY "Users can manage recipe menu items" ON recipe_menu_items
  FOR ALL USING (
    recipe_id IN (
      SELECT id FROM recipes WHERE location_id IN (
        SELECT id FROM public.locations 
        WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
      )
    )
  );

-- Pours Policies
CREATE POLICY "Users can view pours" ON pours
  FOR SELECT USING (
    location_id IN (
      SELECT id FROM public.locations 
      WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
    )
  );

CREATE POLICY "Users can manage pours" ON pours
  FOR ALL USING (
    location_id IN (
      SELECT id FROM public.locations 
      WHERE organization_id IN (SELECT org_id FROM get_my_organizations())
    )
  );

-- ============================================
-- AUTOMATIC INVENTORY DEDUCTION (Optional but recommended)
-- ============================================

-- Function to deduct inventory when a pour is logged
CREATE OR REPLACE FUNCTION log_pour_deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory_items 
  SET stock_quantity = stock_quantity - NEW.quantity,
      updated_at = NOW()
  WHERE id = NEW.inventory_item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_pour_inventory_deduction
AFTER INSERT ON pours
FOR EACH ROW
EXECUTE FUNCTION log_pour_deduct_inventory();
