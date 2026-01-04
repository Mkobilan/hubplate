-- Database Performance Optimization Migration - Part 2
-- This migration addresses the second batch of "Unindexed foreign keys" warnings.

-- customer_feedback (customer_id, order_id, server_id)
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_id ON public.customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_order_id ON public.customer_feedback(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_server_id ON public.customer_feedback(server_id);

-- customers (loyalty_signup_server_id, user_id)
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_signup_server_id ON public.customers(loyalty_signup_server_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- employee_custom_values (field_id)
CREATE INDEX IF NOT EXISTS idx_employee_custom_values_field_id ON public.employee_custom_values(field_id);

-- employee_invites (created_by)
CREATE INDEX IF NOT EXISTS idx_employee_invites_created_by ON public.employee_invites(created_by);

-- historical_sales (location_id)
CREATE INDEX IF NOT EXISTS idx_historical_sales_location_id ON public.historical_sales(location_id);

-- ingredient_links (inventory_item_id)
CREATE INDEX IF NOT EXISTS idx_ingredient_links_inventory_item_id ON public.ingredient_links(inventory_item_id);

-- ingredient_price_history (vendor_id)
CREATE INDEX IF NOT EXISTS idx_ingredient_price_history_vendor_id ON public.ingredient_price_history(vendor_id);

-- inventory_transactions (inventory_item_id)
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_item_id ON public.inventory_transactions(inventory_item_id);

-- invoice_line_items (inventory_item_id)
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_inventory_item_id ON public.invoice_line_items(inventory_item_id);

-- locations (organization_id, owner_id)
CREATE INDEX IF NOT EXISTS idx_locations_organization_id ON public.locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_locations_owner_id ON public.locations(owner_id);

-- loyalty_rewards (location_id, menu_item_id)
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_location_id ON public.loyalty_rewards(location_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_menu_item_id ON public.loyalty_rewards(menu_item_id);

-- organizations (owner_id)
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- reward_redemptions (customer_id, reward_id)
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_customer_id ON public.reward_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON public.reward_redemptions(reward_id);

-- schedule_batches (approved_by, created_by, organization_id, template_id)
CREATE INDEX IF NOT EXISTS idx_schedule_batches_approved_by ON public.schedule_batches(approved_by);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_created_by ON public.schedule_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_organization_id ON public.schedule_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_batches_template_id ON public.schedule_batches(template_id);

-- shift_swap_requests (requester_id, shift_id)
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_requester_id ON public.shift_swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_shift_id ON public.shift_swap_requests(shift_id);

-- time_entries (organization_id)
CREATE INDEX IF NOT EXISTS idx_time_entries_organization_id ON public.time_entries(organization_id);

-- waste_logs (inventory_item_id)
CREATE INDEX IF NOT EXISTS idx_waste_logs_inventory_item_id ON public.waste_logs(inventory_item_id);
