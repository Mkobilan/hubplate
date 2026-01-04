-- Fix search_path for get_active_pricing_rules
-- This resolves the "Function Search Path Mutable" security warning
ALTER FUNCTION public.get_active_pricing_rules(UUID) SET search_path = public;

-- Fix search_path for log_pour_deduct_inventory
-- This resolves the "Function Search Path Mutable" security warning
ALTER FUNCTION public.log_pour_deduct_inventory() SET search_path = public;
