-- INDEXING OPTIMIZATION SCRIPT
-- Resolves "Unindexed foreign keys" and "Unused index" suggestions.

-- -----------------------------------------------------------------------------
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- -----------------------------------------------------------------------------

-- Availability
CREATE INDEX IF NOT EXISTS idx_availability_organization_id ON public.availability(organization_id);

-- Customer Feedback
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_id ON public.customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_order_id ON public.customer_feedback(order_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- Employee Invites
CREATE INDEX IF NOT EXISTS idx_employee_invites_created_by ON public.employee_invites(created_by);
-- Note: idx_employee_invites_location already exists from original schema

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON public.employees(organization_id);

-- Happy Hour Rules
CREATE INDEX IF NOT EXISTS idx_happy_hour_rules_location_id ON public.happy_hour_rules(location_id);

-- Ingredient Links
CREATE INDEX IF NOT EXISTS idx_ingredient_links_inventory_item_id ON public.ingredient_links(inventory_item_id);

-- Inventory Transactions
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_item_id ON public.inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_recorded_by ON public.inventory_transactions(recorded_by);

-- Kitchen Tickets
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_location_id ON public.kitchen_tickets(location_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order_id ON public.kitchen_tickets(order_id);

-- Locations
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON public.locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_owner_id ON public.locations(owner_id);

-- Loyalty Rewards
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_location_id ON public.loyalty_rewards(location_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_menu_item_id ON public.loyalty_rewards(menu_item_id);

-- Marketing Campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON public.marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_location_id ON public.marketing_campaigns(location_id);

-- Menu Categories
CREATE INDEX IF NOT EXISTS idx_menu_categories_location_id ON public.menu_categories(location_id);

-- Menu Items
CREATE INDEX IF NOT EXISTS idx_menu_items_created_by ON public.menu_items(created_by);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_server_id ON public.orders(server_id);

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- Reward Redemptions
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer_id ON public.reward_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_order_id ON public.reward_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON public.reward_redemptions(reward_id);

-- Schedule Batches
CREATE INDEX IF NOT EXISTS idx_schedule_batches_approved_by ON public.schedule_batches(approved_by);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_created_by ON public.schedule_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_organization_id ON public.schedule_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_template_id ON public.schedule_batches(template_id);

-- Shift Swap Requests
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_requester_id ON public.shift_swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_shift_id ON public.shift_swap_requests(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_target_employee_id ON public.shift_swap_requests(target_employee_id);

-- Shifts
CREATE INDEX IF NOT EXISTS idx_shifts_location_id ON public.shifts(location_id);
CREATE INDEX IF NOT EXISTS idx_shifts_organization_id ON public.shifts(organization_id);

-- Time Entries
CREATE INDEX IF NOT EXISTS idx_time_entries_location_id ON public.time_entries(location_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_organization_id ON public.time_entries(organization_id);

-- Waste Logs
CREATE INDEX IF NOT EXISTS idx_waste_logs_inventory_item_id ON public.waste_logs(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_location_id ON public.waste_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_waste_logs_recorded_by ON public.waste_logs(recorded_by);

-- -----------------------------------------------------------------------------
-- 2. REMOVE UNUSED INDEXES
-- -----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_orders_status;
DROP INDEX IF EXISTS public.idx_staffing_templates_org;
DROP INDEX IF EXISTS public.idx_schedule_batches_location;
DROP INDEX IF EXISTS public.idx_schedule_batches_dates;
DROP INDEX IF EXISTS public.idx_shifts_batch;
DROP INDEX IF EXISTS public.idx_employees_user_location;
DROP INDEX IF EXISTS public.idx_orders_payment_status;
