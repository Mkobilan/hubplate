-- Database Performance Optimization Migration
-- This migration addresses "Unindexed foreign keys" and "Unused Index" warnings from the Supabase linter.

-- ==========================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ==========================================

-- add_on_category_assignments (category_id)
CREATE INDEX IF NOT EXISTS idx_add_on_category_assignments_category_id ON public.add_on_category_assignments(category_id);

-- employee_invites (organization_id)
CREATE INDEX IF NOT EXISTS idx_employee_invites_organization_id ON public.employee_invites(organization_id);

-- ingredient_price_history (invoice_id, location_id)
CREATE INDEX IF NOT EXISTS idx_ingredient_price_history_invoice_id ON public.ingredient_price_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_price_history_location_id ON public.ingredient_price_history(location_id);

-- invoice_approvals (employee_id)
CREATE INDEX IF NOT EXISTS idx_invoice_approvals_employee_id ON public.invoice_approvals(employee_id);

-- invoices (approved_by)
CREATE INDEX IF NOT EXISTS idx_invoices_approved_by ON public.invoices(approved_by);

-- payroll_periods (organization_id)
CREATE INDEX IF NOT EXISTS idx_payroll_periods_organization_id ON public.payroll_periods(organization_id);

-- payroll_runs (employee_id)
CREATE INDEX IF NOT EXISTS idx_payroll_runs_employee_id ON public.payroll_runs(employee_id);

-- pours (employee_id, inventory_item_id, location_id, recipe_id)
CREATE INDEX IF NOT EXISTS idx_pours_employee_id ON public.pours(employee_id);
CREATE INDEX IF NOT EXISTS idx_pours_inventory_item_id ON public.pours(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_pours_location_id ON public.pours(location_id);
CREATE INDEX IF NOT EXISTS idx_pours_recipe_id ON public.pours(recipe_id);

-- pricing_rules (location_id)
CREATE INDEX IF NOT EXISTS idx_pricing_rules_location_id ON public.pricing_rules(location_id);

-- purchase_order_items (inventory_item_id, po_id)
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_inventory_item_id ON public.purchase_order_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(po_id);

-- purchase_orders (location_id)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_location_id ON public.purchase_orders(location_id);

-- recipe_ingredients (inventory_item_id, recipe_id)
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_item_id ON public.recipe_ingredients(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);

-- recipe_menu_items (menu_item_id)
-- Note: composite PK (recipe_id, menu_item_id) already indexes recipe_id.
CREATE INDEX IF NOT EXISTS idx_recipe_menu_items_menu_item_id ON public.recipe_menu_items(menu_item_id);

-- recipes (location_id)
CREATE INDEX IF NOT EXISTS idx_recipes_location_id ON public.recipes(location_id);

-- reservations (created_by)
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON public.reservations(created_by);

-- schedule_batches (location_id)
CREATE INDEX IF NOT EXISTS idx_schedule_batches_location_id ON public.schedule_batches(location_id);

-- seating_maps (location_id)
CREATE INDEX IF NOT EXISTS idx_seating_maps_location_id ON public.seating_maps(location_id);

-- seating_tables (assigned_server_id, map_id)
CREATE INDEX IF NOT EXISTS idx_seating_tables_assigned_server_id ON public.seating_tables(assigned_server_id);
CREATE INDEX IF NOT EXISTS idx_seating_tables_map_id ON public.seating_tables(map_id);

-- shift_swap_requests (accepted_by, location_id, swap_shift_id)
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_accepted_by ON public.shift_swap_requests(accepted_by);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_location_id ON public.shift_swap_requests(location_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_swap_shift_id ON public.shift_swap_requests(swap_shift_id);

-- shifts (batch_id)
CREATE INDEX IF NOT EXISTS idx_shifts_batch_id ON public.shifts(batch_id);

-- staffing_templates (organization_id)
CREATE INDEX IF NOT EXISTS idx_staffing_templates_organization_id ON public.staffing_templates(organization_id);

-- tip_pools (location_id)
CREATE INDEX IF NOT EXISTS idx_tip_pools_location_id ON public.tip_pools(location_id);

-- upsell_assignments (upsell_id)
CREATE INDEX IF NOT EXISTS idx_upsell_assignments_upsell_id ON public.upsell_assignments(upsell_id);

-- waitlist (table_id)
CREATE INDEX IF NOT EXISTS idx_waitlist_table_id ON public.waitlist(table_id);


-- ==========================================
-- 2. DROP UNUSED INDEXES
-- ==========================================

DROP INDEX IF EXISTS idx_waitlist_created;
DROP INDEX IF EXISTS idx_historical_sales_location_date;
DROP INDEX IF EXISTS idx_customer_feedback_server;
DROP INDEX IF EXISTS idx_customers_signup_server;
DROP INDEX IF EXISTS idx_locations_slug;
DROP INDEX IF EXISTS invoices_date_idx;
DROP INDEX IF EXISTS invoice_line_items_inventory_idx;
DROP INDEX IF EXISTS price_history_vendor_idx;
DROP INDEX IF EXISTS idx_customer_feedback_customer_id;
DROP INDEX IF EXISTS idx_customer_feedback_order_id;
DROP INDEX IF EXISTS idx_customers_user_id;
DROP INDEX IF EXISTS idx_employee_invites_created_by;
DROP INDEX IF EXISTS idx_ingredient_links_inventory_item_id;
DROP INDEX IF EXISTS idx_inventory_transactions_inventory_item_id;
DROP INDEX IF EXISTS idx_locations_organization_id;
DROP INDEX IF EXISTS idx_locations_owner_id;
DROP INDEX IF EXISTS idx_loyalty_rewards_location_id;
DROP INDEX IF EXISTS idx_loyalty_rewards_menu_item_id;
DROP INDEX IF EXISTS idx_organizations_owner_id;
DROP INDEX IF EXISTS idx_reward_redemptions_customer_id;
DROP INDEX IF EXISTS idx_reward_redemptions_reward_id;
DROP INDEX IF EXISTS idx_schedule_batches_approved_by;
DROP INDEX IF EXISTS idx_schedule_batches_created_by;
DROP INDEX IF EXISTS idx_schedule_batches_organization_id;
DROP INDEX IF EXISTS idx_schedule_batches_template_id;
DROP INDEX IF EXISTS idx_shift_swap_requests_requester_id;
DROP INDEX IF EXISTS idx_shift_swap_requests_shift_id;
DROP INDEX IF EXISTS idx_time_entries_organization_id;
DROP INDEX IF EXISTS idx_waste_logs_inventory_item_id;
DROP INDEX IF EXISTS idx_kds_screens_location;
DROP INDEX IF EXISTS idx_reservations_location;
DROP INDEX IF EXISTS idx_reservations_date;
DROP INDEX IF EXISTS idx_orders_items;
DROP INDEX IF EXISTS notifications_location_id_idx;
DROP INDEX IF EXISTS gift_cards_lookup_idx;
DROP INDEX IF EXISTS historical_sales_date_idx;
DROP INDEX IF EXISTS idx_employees_external_id;
DROP INDEX IF EXISTS idx_organizations_stripe_customer_id;
DROP INDEX IF EXISTS idx_organizations_subscription_status;
DROP INDEX IF EXISTS idx_employee_custom_values_field;
