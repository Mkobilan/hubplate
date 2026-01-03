"use client";

import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

export type PricingRule = {
    id: string;
    location_id: string;
    name: string;
    rule_type: 'discount' | 'surge';
    days_of_week: number[];
    start_time: string;
    end_time: string;
    discount_type: 'percentage' | 'fixed';
    value: number;
    category_ids: string[];
    is_active: boolean;
};

export async function getPricingRules(locationId: string) {
    const supabase = createClient();
    const { data, error } = await (supabase
        .from("pricing_rules") as any)
        .select("*")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching pricing rules:", error);
        throw error;
    }
    return data as PricingRule[];
}

export async function createPricingRule(rule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at' | 'is_active'>) {
    const supabase = createClient();
    const { data, error } = await (supabase
        .from("pricing_rules") as any)
        .insert([{ ...rule, is_active: true }])
        .select()
        .single();

    if (error) {
        console.error("Error creating pricing rule:", error);
        throw error;
    }
    return data as PricingRule;
}

export async function updatePricingRule(id: string, rule: Partial<PricingRule>) {
    const supabase = createClient();
    const { data, error } = await (supabase
        .from("pricing_rules") as any)
        .update(rule)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("Error updating pricing rule:", error);
        throw error;
    }
    return data as PricingRule;
}

export async function deletePricingRule(id: string) {
    const supabase = createClient();
    const { error } = await (supabase
        .from("pricing_rules") as any)
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting pricing rule:", error);
        throw error;
    }
}

export async function togglePricingRule(id: string, isActive: boolean) {
    return updatePricingRule(id, { is_active: isActive });
}
